////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2014-2016 ArangoDB GmbH, Cologne, Germany
/// Copyright 2004-2014 triAGENS GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Jan Steemann
////////////////////////////////////////////////////////////////////////////////

#include "VocBase/ReadCache.h"
#include "VocBase/CollectionRevisionsCache.h"

#include <velocypack/Slice.h>
#include <velocypack/velocypack-aliases.h>

using namespace arangodb;

uint8_t const* ReadCachePosition::vpack() const noexcept {
  return chunk->data() + offset;
}
  
uint8_t* ReadCachePosition::vpack() noexcept {
  return chunk->data() + offset;
}

ReadCache::ReadCache(RevisionCacheChunkAllocator* allocator, CollectionRevisionsCache* collectionCache) 
        : _allocator(allocator), _collectionCache(collectionCache), 
          _writeChunk(nullptr) {}

ReadCache::~ReadCache() {
  try {
    clear(); // clear all chunks
  } catch (...) {
    // ignore any errors because of destructor
  }
}

// clear all chunks currently in use. this is a fast-path deletion without checks
void ReadCache::clear() {
  closeWriteChunk();

  // tell allocator that it can delete all chunks for the collection
  _allocator->removeCollection(this);
}

void ReadCache::closeWriteChunk() {
  MUTEX_LOCKER(locker, _writeMutex);

  if (_writeChunk != nullptr) {
    // unused here so the chunk gets freed immediately
    // we don't care if the chunk is in use
    _allocator->returnUnused(_writeChunk);
    _writeChunk = nullptr;
  }
}

ChunkProtector ReadCache::readAndLease(RevisionCacheEntry const& entry) {
  return ChunkProtector(entry.chunk(), entry.offset(), entry.version());
}

ReadCachePosition ReadCache::insertAndLease(TRI_voc_rid_t revisionId, uint8_t const* vpack) {
  uint32_t const size = static_cast<uint32_t>(VPackSlice(vpack).byteSize());

  ReadCachePosition position(nullptr, UINT32_MAX, 1);

  while (true) { 
    RevisionCacheChunk* returnChunk = nullptr;

    {
      MUTEX_LOCKER(locker, _writeMutex);
      
      if (_writeChunk == nullptr) {
        _writeChunk = _allocator->orderChunk(_collectionCache, size, _collectionCache->chunkSize());
        TRI_ASSERT(_writeChunk != nullptr);
      }
      
      if (_writeChunk != nullptr) {
        position.offset = _writeChunk->advanceWritePosition(size);
        if (position.offset == UINT32_MAX) {
          // chunk is full
          returnChunk = _writeChunk; // save _writeChunk value
          _writeChunk = nullptr; // reset _writeChunk and try again
        } else {
          position.chunk = _writeChunk;
        }
      }
    }
    
    if (returnChunk != nullptr) {
      // return chunk without mutex
      _allocator->returnUsed(this, returnChunk);
    } else if (position.chunk != nullptr) {
    // check result without mutex
      TRI_ASSERT(position.offset != UINT32_MAX);
      // we got a free slot in the chunk. copy data and return target position
      memcpy(position.vpack(), vpack, size); 
      return position;
    }
    
    // try again
  }
}

