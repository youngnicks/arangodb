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

ReadCache::ReadCache(RevisionCacheChunkAllocator* allocator) 
        : _allocator(allocator), _writeChunk(nullptr), _totalAllocated(0), _toClear(nullptr) {}

ReadCache::~ReadCache() {
  try {
    clear(); // clear all chunks
  } catch (...) {
    // ignore any errors because of destructor
  }
}

// clear all chunks currently in use. this is a fast-path deletion without checks
void ReadCache::clear() {
  MUTEX_LOCKER(gcLocker, _gcMutex);

  MUTEX_LOCKER(locker, _mutex);

  if (_writeChunk != nullptr) {
    // push current write chunk into the list of full chunks
    _fullChunks.push_back(_writeChunk);
    _writeChunk = nullptr;
  }

  if (_toClear != nullptr) {
    // push current item to clear onto the free list
    _freeList.push_back(_toClear);
    _toClear = nullptr;
  }

  // move full chunks onto the free list
  for (auto it = _fullChunks.begin(); it != _fullChunks.end(); /* no hoisting */) {
    RevisionCacheChunk* chunk = (*it);
    _freeList.push_back(chunk);
    it = _fullChunks.erase(it);
  }

  // and clear all chunks from the free list
  for (auto it = _freeList.begin(); it != _freeList.end(); /* no hoisting */) {
    RevisionCacheChunk* chunk = (*it);

    // we don't care if the chunk is in use
    _totalAllocated -= chunk->size();
    _allocator->returnChunk(chunk);
    it = _fullChunks.erase(it);
  }

  TRI_ASSERT(_writeChunk == nullptr);
  TRI_ASSERT(_toClear == nullptr);
  TRI_ASSERT(_fullChunks.empty());
  TRI_ASSERT(_freeList.empty());
}

bool ReadCache::prepareGarbageCollection(CollectionRevisionsCache* cache) {
  MUTEX_LOCKER(gcLocker, _gcMutex);

  { 
    MUTEX_LOCKER(locker, _mutex);

    if (_toClear == nullptr) {
      if (_fullChunks.empty()) {
        return false;
      }
    
      _toClear = _fullChunks.front();
      _fullChunks.pop_front();
    }
  }

  // go on without mutex
  TRI_ASSERT(_toClear != nullptr);

  std::vector<TRI_voc_rid_t> revisions;
  revisions.reserve(2048);
 
  _toClear->findRevisions(revisions);
  cache->removeRevisions(revisions);

  _freeList.push_back(_toClear);
  _toClear = nullptr;

  return true;
}

bool ReadCache::garbageCollect(size_t maxChunks) {
  MUTEX_LOCKER(gcLocker, _gcMutex);

  if (_freeList.empty()) {
    return false;
  }

  size_t cleared = 0;

  for (auto it = _freeList.begin(); it != _freeList.end(); /* no hoisting */) {
    RevisionCacheChunk* chunk = (*it);

    if (chunk->isUsed()) {
      ++it;
    } else {
      // we don't care if the chunk is in use
      _totalAllocated -= chunk->size();
      _allocator->returnChunk(chunk);
      it = _freeList.erase(it);

      if (++cleared >= maxChunks) {
        return false;
      }
    }
  }

  return true;
}

ChunkUsageStatus ReadCache::readAndLease(RevisionCacheEntry const& entry) {
  return ChunkUsageStatus(entry.chunk(), entry.offset(), entry.version());
}

ReadCachePosition ReadCache::insertAndLease(TRI_voc_rid_t revisionId, uint8_t const* vpack) {
  uint32_t const size = static_cast<uint32_t>(VPackSlice(vpack).byteSize());

  ReadCachePosition position(nullptr, UINT32_MAX, 1);

  while (true) { 
    {
      MUTEX_LOCKER(locker, _mutex);

      if (_writeChunk == nullptr) {
        bool hasMemoryPressure = false;
        _writeChunk = _allocator->orderChunk(size, hasMemoryPressure);
        TRI_ASSERT(_writeChunk != nullptr);
        _totalAllocated += _writeChunk->size();
      }
      
      if (_writeChunk != nullptr) {
        position.offset = _writeChunk->advanceWritePosition(size);
        if (position.offset == UINT32_MAX) {
          // chunk is full
          _fullChunks.push_back(_writeChunk);
          _writeChunk = nullptr; // reset _writeChunk and try again
        } else {
          position.chunk = _writeChunk;
        }
      }
    }

    // check result without mutex
    if (position.chunk != nullptr) {
      TRI_ASSERT(position.offset != UINT32_MAX);
      // we got a free slot in the chunk. copy data and return target position
      memcpy(position.vpack(), vpack, size); 
      return position;
    }

    // try again
  }
}

