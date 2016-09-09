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

#include "CollectionRevisionCache.h"
#include "Basics/MutexLocker.h"
#include "VocBase/RevisionCacheChunk.h"
#include "VocBase/RevisionCacheChunkAllocator.h"

#include <velocypack/Slice.h>
#include <velocypack/velocypack-aliases.h>

using namespace arangodb;

CollectionRevisionCache::CollectionRevisionCache(RevisionCacheChunkAllocator* allocator) 
    : _allocator(allocator),
      _writeChunk(nullptr) {
  TRI_ASSERT(allocator != nullptr);
}

CollectionRevisionCache::~CollectionRevisionCache() {
  MUTEX_LOCKER(locker, _writeMutex);

  for (auto& it : _fullChunks) {
    _allocator->returnChunk(it);
  }
}

bool CollectionRevisionCache::insertFromWal(TRI_voc_rid_t revisionId, TRI_voc_fid_t datafileId, uint32_t offset) {
  return _positions.emplace(revisionId, DocumentPosition(datafileId, offset)).second;
}
   
bool CollectionRevisionCache::insertFromEngine(TRI_voc_rid_t revisionId, VPackSlice const& data) {
  DocumentPosition p(store(data.begin(), data.byteSize()));
  return _positions.emplace(revisionId, p).second;
}

bool CollectionRevisionCache::remove(TRI_voc_rid_t revisionId) {
  return (_positions.erase(revisionId) != 0);
}

bool CollectionRevisionCache::garbageCollect(size_t maxChunksToClear) {
  size_t chunksCleared = 0;

  MUTEX_LOCKER(locker, _writeMutex);
 
  for (auto it = _fullChunks.begin(); it != _fullChunks.end(); /* no hoisting */) {
    if ((*it)->garbageCollect()) {
      _allocator->returnChunk(*it);
      it = _fullChunks.erase(it);
      if (++chunksCleared >= maxChunksToClear) {
        return true;
      }
    } else {
      ++it;
    }
  }

  return false;
}

DocumentPosition CollectionRevisionCache::store(uint8_t const* data, uint32_t size) {
  uint32_t const pieceSize = RevisionCacheChunk::pieceSize(size);
  
  RevisionCacheChunk* chunk = nullptr;
  uint32_t offset = 0;
  
  while (true) {
    MUTEX_LOCKER(locker, _writeMutex);

    if (_writeChunk == nullptr) {
      _writeChunk = _allocator->orderChunk(size);
    }

    TRI_ASSERT(_writeChunk != nullptr);
    offset = _writeChunk->advanceWritePosition(pieceSize);
    if (offset != UINT32_MAX) {
      chunk = _writeChunk;
      break;
    }
    // chunk is full
    _fullChunks.push_back(_writeChunk); // if this fails then it will be retried next time
    _writeChunk = nullptr;
    
    // try again in next iteration
  }

  TRI_ASSERT(chunk != nullptr);
  TRI_ASSERT(offset != UINT32_MAX);

  // copy data without lock. TODO: protect chunk from beign garbage collected and destroyed somewhere here!!!
  memcpy(chunk->begin() + offset, data, size);

  return DocumentPosition(chunk, offset);
}
