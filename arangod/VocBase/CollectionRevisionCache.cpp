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
#include "VocBase/RevisionCacheChunk.h"
#include "VocBase/RevisionCacheChunkAllocator.h"

using namespace arangodb;

CollectionRevisionCache::CollectionRevisionCache(RevisionCacheChunkAllocator* allocator) 
    : _allocator(allocator) {
  TRI_ASSERT(allocator != nullptr);
}

CollectionRevisionCache::~CollectionRevisionCache() {
  for (auto& it : _chunks) {
    _allocator->returnChunk(it);
  }
}
  
bool CollectionRevisionCache::insertFromWal(TRI_voc_rid_t revisionId, TRI_voc_fid_t datafileId, uint32_t offset) {
  return _positions.emplace(revisionId, DocumentPosition(datafileId, offset)).second;
}
   
bool CollectionRevisionCache::insertFromChunk(TRI_voc_rid_t revisionId, RevisionCacheChunk* chunk, uint32_t offset) {
  return _positions.emplace(revisionId, DocumentPosition(chunk, offset)).second;
}

bool CollectionRevisionCache::remove(TRI_voc_rid_t revisionId) {
  return (_positions.erase(revisionId) != 0);
}
