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

#ifndef ARANGOD_VOCBASE_REVISION_CACHE_CHUNK_ALLOCATOR_H
#define ARANGOD_VOCBASE_REVISION_CACHE_CHUNK_ALLOCATOR_H 1

#include "Basics/Common.h"
#include "Basics/ReadWriteLock.h"
#include "VocBase/RevisionCacheChunk.h"

namespace arangodb {

class RevisionCacheChunkAllocator {
 public:
  RevisionCacheChunkAllocator() = delete;
  RevisionCacheChunkAllocator(RevisionCacheChunkAllocator const&) = delete;
  RevisionCacheChunkAllocator& operator=(RevisionCacheChunkAllocator const&) = delete;

  RevisionCacheChunkAllocator(uint32_t defaultChunkSize, uint64_t totalTargetSize);
  ~RevisionCacheChunkAllocator();
  
 public:
  
  /// @brief total number of bytes allocated by the cache
  uint64_t totalAllocated();

  /// @brief order a new chunk
  RevisionCacheChunk* orderChunk(uint32_t targetSize);

  /// @brief return an unused chunk
  void returnChunk(RevisionCacheChunk* chunk);

 private:
  /// @brief calculate the effective size for a new chunk
  uint32_t newChunkSize(uint32_t dataSize) const noexcept;

 private:
  // lock for the lists of chunks
  arangodb::basics::ReadWriteLock _chunksLock;

  // completely (or partially unused) chunks that can still be written to
  std::vector<RevisionCacheChunk*> _freeList;

  // default size for new memory chunks
  uint32_t _defaultChunkSize;

  // total target size for all chunks
  uint64_t _totalTargetSize;

  // total number of bytes allocated by chunks
  uint64_t _totalAllocated;
};

} // namespace arangodb

#endif
