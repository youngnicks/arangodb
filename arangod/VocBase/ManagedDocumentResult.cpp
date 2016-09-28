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

#include "ManagedDocumentResult.h"

using namespace arangodb;
  
ManagedDocumentResult::ManagedDocumentResult() : _chunk(nullptr), _vpack(nullptr) {}

ManagedDocumentResult::~ManagedDocumentResult() {
  clear();
}

void ManagedDocumentResult::add(ChunkProtector&& protector) {
  if (protector.chunk() != _chunk) {
    clear();
  }
  
  _vpack = protector.vpack();
  _chunk = protector.chunk();
  protector.steal();
}

void ManagedDocumentResult::clear() {
  if (_chunk != nullptr) {
    _chunk->release();
    _chunk = nullptr;
  }
}
  
ManagedDocumentResult& ManagedDocumentResult::operator=(ManagedDocumentResult const& other) {
  if (this != &other) {
    clear();
    _vpack = other._vpack;
    _chunk = other._chunk;
    _chunk->use();
  }
  return *this;
}

ManagedMultiDocumentResult::~ManagedMultiDocumentResult() {
  for (auto& chunk : _chunks) {
    chunk->release();
  }
}
  
void ManagedMultiDocumentResult::add(ChunkProtector&& protector) {
  RevisionCacheChunk* chunk = protector.chunk();
  uint8_t const* vpack = protector.vpack();

  auto it = _chunks.find(chunk);
  if (it == _chunks.end()) {
    _chunks.emplace(chunk);
    protector.steal();
  }

  _results.push_back(vpack);
}

void ManagedMultiDocumentResult::add(uint8_t const* vpack) {
  _results.push_back(vpack);
}

