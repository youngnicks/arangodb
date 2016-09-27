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

#include "RevisionCacheChunkAllocator.h"
#include "Basics/ConditionLocker.h"
#include "Basics/ReadLocker.h"
#include "Basics/WriteLocker.h"

using namespace arangodb;

RevisionCacheChunkAllocator::RevisionCacheChunkAllocator(uint32_t defaultChunkSize, uint64_t totalTargetSize)
    : _defaultChunkSize(defaultChunkSize), 
      _totalTargetSize(totalTargetSize), 
      _totalAllocated(0) { 

  TRI_ASSERT(defaultChunkSize >= 1024);

  _freeList.reserve(4);
}

RevisionCacheChunkAllocator::~RevisionCacheChunkAllocator() {
  // free all chunks
  WRITE_LOCKER(locker, _chunksLock);

  for (auto& chunk : _freeList) {
    delete chunk;
  }
}
  
// total number of bytes allocated by the cache
uint64_t RevisionCacheChunkAllocator::totalAllocated() {
  READ_LOCKER(locker, _chunksLock);
  return _totalAllocated;
}

RevisionCacheChunk* RevisionCacheChunkAllocator::orderChunk(uint32_t targetSize, bool& hasMemoryPressure) {
  hasMemoryPressure = false;

  {
    // first check if there's a chunk ready on the freelist
    READ_LOCKER(locker, _chunksLock);
    if (!_freeList.empty()) {
      RevisionCacheChunk* chunk = _freeList.back();
      _freeList.pop_back();
      return chunk;
    }
  }

  // could not find a chunk on the freelist
  // create a new chunk now
  uint32_t const size = newChunkSize(targetSize);
  auto c = std::make_unique<RevisionCacheChunk>(size);

  {
    WRITE_LOCKER(locker, _chunksLock);
    // check freelist again
    if (!_freeList.empty()) {
      // a free chunk arrived on the freelist
      RevisionCacheChunk* chunk = _freeList.back();
      _freeList.pop_back();
      return chunk;
    }

    // no chunk arrived on the freelist, no return what we created
    _totalAllocated += size;
    hasMemoryPressure = (_totalAllocated > _totalTargetSize);
  }

  return c.release();
}

void RevisionCacheChunkAllocator::returnChunk(RevisionCacheChunk* chunk) {
  uint32_t const size = chunk->size();
  bool freeChunk = true;

  {
    WRITE_LOCKER(locker, _chunksLock);

    try {
      if (_totalAllocated < _totalTargetSize) {
        // put chunk back onto the freelist
        _freeList.push_back(chunk);
        freeChunk = false;
      }
    } catch (...) {
    }

    if (freeChunk) {
      // when we free the chunk, we must adjust the total allocated size
      TRI_ASSERT(_totalAllocated >= size);
      _totalAllocated -= size;
    }
  }

  if (freeChunk) {
    delete chunk;
  }
}

bool RevisionCacheChunkAllocator::garbageCollect() {
  RevisionCacheChunk* chunk = nullptr;

  {
    WRITE_LOCKER(locker, _chunksLock);
    if (!_freeList.empty() && _totalAllocated > _totalTargetSize) {
      chunk = _freeList.back();
      _freeList.pop_back();
    }
  }

  delete chunk;
  return (chunk != nullptr);
}

/// @brief calculate the effective size for a new chunk
uint32_t RevisionCacheChunkAllocator::newChunkSize(uint32_t dataLength) const noexcept {
  return (std::max)(_defaultChunkSize, RevisionCacheChunk::alignSize(dataLength));
}

RevisionCacheGCThread::RevisionCacheGCThread(RevisionCacheChunkAllocator* allocator)
        : Thread("ReadCacheCleaner"), _allocator(allocator) {}

void RevisionCacheGCThread::beginShutdown() {
  Thread::beginShutdown();

  CONDITION_LOCKER(guard, _condition);
  _condition.signal();
}

void RevisionCacheGCThread::run() {
  while (!isStopping()) {
    if (!_allocator->garbageCollect()) {
      CONDITION_LOCKER(guard, _condition);
      guard.wait(1000000);
    }
  }
}

