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
#include "VocBase/LogicalCollection.h"
#include "VocBase/PhysicalCollection.h"
#include "VocBase/RevisionCacheChunk.h"
#include "Wal/LogfileManager.h"

using namespace arangodb;

CollectionRevisionsCache::CollectionRevisionsCache(LogicalCollection* collection, RevisionCacheChunkAllocator* allocator) 
    : _collection(collection), _readCache(allocator, this) {}

CollectionRevisionsCache::~CollectionRevisionsCache() {
  try {
    clear();
  } catch (...) {
    // ignore errors here because of destructor
  }
}

std::string CollectionRevisionsCache::name() const {
  return _collection->name();
}

uint32_t CollectionRevisionsCache::chunkSize() const {
  if (_collection->isSystem()) {
    return 512 * 1024; // use small chunks for system collections
  }
  return 0; // means: use system default 
}

void CollectionRevisionsCache::closeWriteChunk() {
  _readCache.closeWriteChunk();
}

void CollectionRevisionsCache::clear() {
  // TODO: use something like shrink_to_fit here
  _revisions.clear();
  _readCache.clear();
}

// look up a revision
bool CollectionRevisionsCache::lookupRevision(ManagedDocumentResult& result, TRI_voc_rid_t revisionId) {
  READ_LOCKER(locker, _lock);
  
  auto it = _revisions.find(revisionId);

  if (it != _revisions.end()) {
    // revision found in hash table
    RevisionCacheEntry const& found = (*it).second;
    
    if (found.isWal()) {
      // document is still in WAL
      // TODO: handle WAL reference counters
      wal::Logfile* logfile = found.logfile();
      // now move it into read cache
      locker.unlock();

      ReadCachePosition rcp = _readCache.insertAndLease(revisionId, reinterpret_cast<uint8_t const*>(logfile->data() + found.offset()));
      // must have succeeded (otherwise an exception was thrown)
      uint8_t const* vpack = rcp.vpack();
      TRI_ASSERT(vpack != nullptr);
      // and insert result into the hash
      insertRevision(revisionId, rcp.chunk, rcp.offset, rcp.version);
      // TODO: handle WAL reference counters
      result.set(vpack);
      return true;
    } 

    // document is not in WAL but already in read cache
    ChunkProtector status = _readCache.readAndLease(found);
    uint8_t const* vpack = status.vpack();
    if (vpack != nullptr) {
      // found in read cache, and still valid
      result.set(vpack);
      return true;
    }
  }

  // either revision was not in hash or it was in hash but outdated
  // return the lock as we are going to modify the hash soon 
  locker.unlock();

  // fetch document from engine
  uint8_t const* vpack = readFromEngine(revisionId);
  if (vpack == nullptr) {
    // engine could not provide the revision
    return false;
  }
  // insert found revision into our hash
  ReadCachePosition rcp = _readCache.insertAndLease(revisionId, vpack);
  vpack = rcp.vpack();
  TRI_ASSERT(vpack != nullptr);
  // insert result into the hash
  insertRevision(revisionId, rcp.chunk, rcp.offset, rcp.version);
  result.set(vpack);
  return true;
}

// look up a revision
bool CollectionRevisionsCache::lookupRevision(ManagedMultiDocumentResult& result, TRI_voc_rid_t revisionId) {
  READ_LOCKER(locker, _lock);
  
  auto it = _revisions.find(revisionId);

  if (it != _revisions.end()) {
    // revision found in hash table
    RevisionCacheEntry const& found = (*it).second;
    
    if (found.isWal()) {
      // document is still in WAL
      // TODO: handle WAL reference counters
      wal::Logfile* logfile = found.logfile();
      // now move it into read cache
      locker.unlock();

      ReadCachePosition rcp = _readCache.insertAndLease(revisionId, reinterpret_cast<uint8_t const*>(logfile->data() + found.offset()));
      // must have succeeded (otherwise an exception was thrown)
      uint8_t const* vpack = rcp.vpack();
      TRI_ASSERT(vpack != nullptr);
      // and insert result into the hash
      insertRevision(revisionId, rcp.chunk, rcp.offset, rcp.version);
      // TODO: handle WAL reference counters
      result.push_back(vpack);
      return true;
    } 

    // document is not in WAL but already in read cache
    ChunkProtector status = _readCache.readAndLease(found);
    uint8_t const* vpack = status.vpack();
    if (vpack != nullptr) {
      // found in read cache, and still valid
      result.push_back(vpack);
      return true;
    }
  }

  // either revision was not in hash or it was in hash but outdated
  // return the lock as we are going to modify the hash soon 
  locker.unlock();

  // fetch document from engine
  uint8_t const* vpack = readFromEngine(revisionId);
  if (vpack == nullptr) {
    // engine could not provide the revision
    return false;
  }
  // insert found revision into our hash
  ReadCachePosition rcp = _readCache.insertAndLease(revisionId, vpack);
  vpack = rcp.vpack();
  TRI_ASSERT(vpack != nullptr);
  // insert result into the hash
  insertRevision(revisionId, rcp.chunk, rcp.offset, rcp.version);
  result.push_back(vpack);
  return true;
}

// insert from chunk
void CollectionRevisionsCache::insertRevision(TRI_voc_rid_t revisionId, RevisionCacheChunk* chunk, uint32_t offset, uint32_t version) {
  WRITE_LOCKER(locker, _lock);
  auto it = _revisions.emplace(revisionId, RevisionCacheEntry(chunk, offset, version));
  if (!it.second) {
    _revisions.erase(it.first);
    _revisions.emplace(revisionId, RevisionCacheEntry(chunk, offset, version));
  }
}
  
// insert from WAL
void CollectionRevisionsCache::insertRevision(TRI_voc_rid_t revisionId, wal::Logfile* logfile, uint32_t offset) {
  WRITE_LOCKER(locker, _lock);
  auto it = _revisions.emplace(revisionId, RevisionCacheEntry(logfile, offset));
  if (!it.second) {
    _revisions.erase(it.first);
    _revisions.emplace(revisionId, RevisionCacheEntry(logfile, offset));
  }
}

// remove a revision
void CollectionRevisionsCache::removeRevision(TRI_voc_rid_t revisionId) {
  WRITE_LOCKER(locker, _lock);
  _revisions.erase(revisionId);
}

void CollectionRevisionsCache::removeRevisions(std::vector<TRI_voc_rid_t> const& revisions) {
  WRITE_LOCKER(locker, _lock);
  for (auto const& it : revisions) {
    _revisions.erase(it);
  }
}
  
uint8_t const* CollectionRevisionsCache::readFromEngine(TRI_voc_rid_t revisionId) {
  return _collection->getPhysical()->lookupRevisionVPack(revisionId);
}
