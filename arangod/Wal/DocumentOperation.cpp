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

#include "DocumentOperation.h"
#include "Indexes/IndexElement.h"
#include "Indexes/PrimaryIndex.h"
#include "Utils/Transaction.h"
#include "VocBase/DatafileHelper.h"
#include "VocBase/LogicalCollection.h"
#include "VocBase/MasterPointer.h"
#include "VocBase/MasterPointers.h"

using namespace arangodb;
using namespace arangodb::wal;
  
DocumentOperation::DocumentOperation(arangodb::Transaction* trx, 
                                     LogicalCollection* collection,
                                     TRI_voc_document_operation_e type)
      : _trx(trx),
        _collection(collection),
        _tick(0),
        _oldFid(0),
        _oldSize(0),
        _type(type),
        _status(StatusType::CREATED) {
}

DocumentOperation::~DocumentOperation() {
  try {
    if (_status == StatusType::HANDLED) {
      if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
          _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
        // remove old, now unused revision
        TRI_ASSERT(!_oldRevision.empty());
        TRI_ASSERT(!_newRevision.empty());
        _collection->getPhysical()->removeRevision(_oldRevision._revisionId, true);
      } else if (_type == TRI_VOC_DOCUMENT_OPERATION_REMOVE) {
        // remove old, now unused revision
        TRI_ASSERT(!_oldRevision.empty());
        TRI_ASSERT(_newRevision.empty());
        _collection->getPhysical()->removeRevision(_oldRevision._revisionId, true);
      }
    } else if (_status != StatusType::REVERTED) {
      revert();
    }
  } catch (...) {
    // we're in the dtor here and must never throw
  }
}
  
DocumentOperation* DocumentOperation::swap() {
  DocumentOperation* copy =
      new DocumentOperation(_trx, _collection, _type);
  copy->_tick = _tick;
  copy->_oldRevision = _oldRevision;
  copy->_newRevision = _newRevision;
  copy->_oldSize = _oldSize;
  copy->_oldFid = _oldFid;
  copy->_status = _status;

  _type = TRI_VOC_DOCUMENT_OPERATION_UNKNOWN;
  _status = StatusType::SWAPPED;
  _oldRevision.clear();
  _newRevision.clear();

  return copy;
}
  
TRI_voc_fid_t DocumentOperation::getOldFid() const {
  return _oldFid;
}
  
uint32_t DocumentOperation::getOldAlignedMarkerSize() const { 
  return _oldSize;
}

void DocumentOperation::setVPack(uint8_t const* vpack) {
  TRI_ASSERT(!_newRevision.empty());
  _newRevision._vpack = vpack;
}

void DocumentOperation::setRevision(DocumentDescriptor const& oldRevision,
                                    TRI_voc_fid_t oldFid, uint32_t oldSize,
                                    DocumentDescriptor const& newRevision) {
  TRI_ASSERT(_oldRevision.empty());
  TRI_ASSERT(_newRevision.empty());

  _oldFid = oldFid;
  _oldSize = oldSize; 

  if (_type == TRI_VOC_DOCUMENT_OPERATION_INSERT) {
    TRI_ASSERT(oldRevision.empty());
    TRI_ASSERT(!newRevision.empty());
    _oldRevision.clear();
    _newRevision.reset(newRevision);
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
             _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
    TRI_ASSERT(!oldRevision.empty());
    TRI_ASSERT(!newRevision.empty());
    _oldRevision.reset(oldRevision);
    _newRevision.reset(newRevision);
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_REMOVE) {
    TRI_ASSERT(!oldRevision.empty());
    TRI_ASSERT(newRevision.empty());
    _oldRevision.reset(oldRevision);
    _newRevision.clear();
  }
}

void DocumentOperation::revert() {
  if (_status == StatusType::CREATED || 
      _status == StatusType::SWAPPED ||
      _status == StatusType::REVERTED) {
    return;
  }

  TRI_ASSERT(_status == StatusType::INDEXED || _status == StatusType::HANDLED);
   
  TRI_voc_rid_t oldRevisionId = 0;
  VPackSlice oldDoc;
  if (_type != TRI_VOC_DOCUMENT_OPERATION_INSERT) {
    TRI_ASSERT(!_oldRevision.empty());
    oldRevisionId = _oldRevision._revisionId;
    oldDoc = VPackSlice(_oldRevision._vpack);
  }

  TRI_voc_rid_t newRevisionId = 0;
  VPackSlice newDoc;
  if (_type != TRI_VOC_DOCUMENT_OPERATION_REMOVE) {
    TRI_ASSERT(!_newRevision.empty());
    newRevisionId = _newRevision._revisionId;
    newDoc = VPackSlice(_newRevision._vpack);
  }
  _collection->rollbackOperation(_trx, _type, oldRevisionId, oldDoc, newRevisionId, newDoc);

  if (_type == TRI_VOC_DOCUMENT_OPERATION_INSERT) {
    TRI_ASSERT(_oldRevision.empty());
    TRI_ASSERT(!_newRevision.empty());
    // remove now obsolete new revision
    _collection->getPhysical()->removeRevision(newRevisionId, true);
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
             _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
    TRI_ASSERT(!_oldRevision.empty());
    TRI_ASSERT(!_newRevision.empty());
    IndexElement* element = _collection->primaryIndex()->lookupKey(_trx, Transaction::extractKeyFromDocument(newDoc));
    if (element != nullptr) {
      element->revisionId(oldRevisionId);
    }
    
    // remove now obsolete new revision
    _collection->getPhysical()->removeRevision(newRevisionId, true);
  }

  _status = StatusType::REVERTED;
}

