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
#include "Basics/Mutex.h"
#include "VocBase/voc-types.h"

namespace arangodb {

class RevisionCacheChunk {
 public:
  RevisionCacheChunk(RevisionCacheChunk const&) = delete;
  RevisionCacheChunk& operator=(RevisionCacheChunk const&) = delete;

  explicit RevisionCacheChunk(uint32_t size);
  ~RevisionCacheChunk();

 public:
  // return the effective size for a piece of data
  static uint32_t pieceSize(uint32_t dataSize) noexcept { return alignSize(dataSize + 16); } // TODO

  inline uint32_t size() const noexcept { return _size; }

  uint32_t advanceWritePosition(uint32_t size);
  
  // prepare garbage collection by increasing the chunk's version number
  // this will make all future reads ignore data in the chunk

  void prepareGarbageCollection() { ++_version; }
  bool garbageCollect();

  inline uint8_t* data() const noexcept { return _data; }
  inline uint8_t* begin() const noexcept { return _data; }
  inline uint8_t* end() const noexcept { return _data + _size; }
 
 private:
  
  // align the length value to a multiple of 8
  static constexpr inline uint32_t alignSize(uint32_t value) {
    return (value + 7) - ((value + 7) & 7);
  }

 private:
  // lock protecting _offset
  mutable arangodb::Mutex _writeMutex;

  // pointer to the chunk's raw memory
  uint8_t* _data;

  // pointer to the current write position
  uint32_t _writeOffset;

  // size of the chunk's memory
  uint32_t const _size;

  // reference counter
  std::atomic<uint64_t> _refCount;

  // chunk version
  std::atomic<uint32_t> _version;
};

} // namespace

#endif
