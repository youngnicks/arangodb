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

#include "CollectionRevisionsCache.h"
#include "Basics/ReadLocker.h"
#include "Basics/WriteLocker.h"
#include "Logger/Logger.h"
#include "VocBase/DatafileHelper.h"

using namespace arangodb;

CollectionRevisionsCache::CollectionRevisionsCache() {}

CollectionRevisionsCache::~CollectionRevisionsCache() {}

DocumentPosition CollectionRevisionsCache::lookup(TRI_voc_rid_t revisionId) const {
  READ_LOCKER(locker, _lock);
  auto it = _positions.find(revisionId);
  
  if (it == _positions.end()) {
    return DocumentPosition();
  }
  return (*it).second;
}

void CollectionRevisionsCache::insert(TRI_voc_rid_t revisionId, void const* dataptr, TRI_voc_fid_t fid, bool isInWal) {
  WRITE_LOCKER(locker, _lock);
  auto it = _positions.emplace(revisionId, DocumentPosition(dataptr, fid, isInWal));
  if (!it.second) {
    DocumentPosition& old = _positions[revisionId];
    old.dataptr(dataptr);
    old.fid(fid, isInWal);
  }
}

void CollectionRevisionsCache::update(TRI_voc_rid_t revisionId, void const* dataptr, TRI_voc_fid_t fid, bool isInWal) {
  WRITE_LOCKER(locker, _lock);
  
  auto it = _positions.find(revisionId);
  if (it == _positions.end()) {
    return;
  }
     
  DocumentPosition& old = (*it).second;
  old.dataptr(dataptr);
  old.fid(fid, isInWal); 
}
  
bool CollectionRevisionsCache::updateConditional(TRI_voc_rid_t revisionId, TRI_df_marker_t const* oldPosition, TRI_df_marker_t const* newPosition, TRI_voc_fid_t newFid, bool isInWal) {
  WRITE_LOCKER(locker, _lock);

  auto it = _positions.find(revisionId);
  if (it == _positions.end()) {
    return false;
  }
     
  DocumentPosition& old = (*it).second;
  if (!old.valid()) {
    return false;
  }
    
  uint8_t const* vpack = static_cast<uint8_t const*>(old.dataptr());
  TRI_ASSERT(vpack != nullptr);

  TRI_df_marker_t const* markerPtr = reinterpret_cast<TRI_df_marker_t const*>(vpack - arangodb::DatafileHelper::VPackOffset(TRI_DF_MARKER_VPACK_DOCUMENT));

  if (markerPtr != oldPosition) {
    // element already outdated
    return false;
  }

  old.dataptr(reinterpret_cast<char const*>(newPosition) + arangodb::DatafileHelper::VPackOffset(TRI_DF_MARKER_VPACK_DOCUMENT));
  old.fid(newFid, isInWal); 

  return true;
}
   
void CollectionRevisionsCache::remove(TRI_voc_rid_t revisionId) {
  WRITE_LOCKER(locker, _lock);
  _positions.erase(revisionId);
}

DocumentPosition CollectionRevisionsCache::fetchAndRemove(TRI_voc_rid_t revisionId) {
  WRITE_LOCKER(locker, _lock);
  auto it = _positions.find(revisionId);
  if (it != _positions.end()) {
    DocumentPosition result((*it).second);
    _positions.erase(it);
    return result;
  }
  return DocumentPosition();
}

