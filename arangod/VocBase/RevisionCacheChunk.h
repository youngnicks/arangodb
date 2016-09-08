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

#ifndef ARANGOD_VOCBASE_REVISION_CACHE_CHUNK_H
#define ARANGOD_VOCBASE_REVISION_CACHE_CHUNK_H 1

#include "Basics/Common.h"
#include "VocBase/voc-types.h"

namespace arangodb {

class RevisionCacheChunk {
 public:
  RevisionCacheChunk(RevisionCacheChunk const&) = delete;
  RevisionCacheChunk& operator=(RevisionCacheChunk const&) = delete;

  explicit RevisionCacheChunk(size_t size);
  ~RevisionCacheChunk();

 public:
  // return the physical size for a piece of data
  static size_t size(size_t dataLength) noexcept { return dataLength + 16; } // TODO

  inline size_t size() const noexcept { return _size; }

 private:
  // pointer to the chunk's raw memory
  char*                _memory;

  // size of the chunk's memory
  size_t const         _size;
};

} // namespace

#endif
