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

#include "RevisionCacheChunk.h"
#include "Basics/MutexLocker.h"

using namespace arangodb;

RevisionCacheChunk::RevisionCacheChunk(size_t size)
    : _memory(nullptr), _position(nullptr), _size(size) {
  _memory = new uint8_t[size];
  _position = _memory;
}

RevisionCacheChunk::~RevisionCacheChunk() {
  delete[] _memory;
}

uint8_t* RevisionCacheChunk::advanceWritePosition(size_t size) {
  uint8_t* position;
  {
    MUTEX_LOCKER(locker, _writeMutex);

    if (_position + size > end()) {
      // chunk would be full
      _position = end(); // seal it
      return nullptr;
    }
    position = _position;
    _position += size;
  }

  return position;
}

bool RevisionCacheChunk::isSealed() const {
  MUTEX_LOCKER(locker, _writeMutex);
  return (_position == end());
}

bool RevisionCacheChunk::garbageCollect() {
  // TODO
  return false;
}

