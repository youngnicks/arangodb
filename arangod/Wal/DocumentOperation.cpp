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
        _oldHeader(nullptr),
        _newHeader(nullptr),
        _tick(0),
        _type(type),
        _status(StatusType::CREATED) {
}

DocumentOperation::~DocumentOperation() {
  try {
    if (_status == StatusType::HANDLED) {
      if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
          _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
        // remove old, now unused revision
        TRI_ASSERT(_oldHeader != nullptr);
        TRI_ASSERT(_newHeader != nullptr);
        _collection->getPhysical()->removeRevision(_oldHeader->revisionId(), true);
      } else if (_type == TRI_VOC_DOCUMENT_OPERATION_REMOVE) {
        // remove old, now unused revision
        TRI_ASSERT(_oldHeader != nullptr);
        TRI_ASSERT(_newHeader == nullptr);
        _collection->getPhysical()->removeRevision(_oldHeader->revisionId(), true);
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
  copy->_oldHeader = _oldHeader;
  copy->_newHeader = _newHeader;
  copy->_status = _status;

  _type = TRI_VOC_DOCUMENT_OPERATION_UNKNOWN;
  _status = StatusType::SWAPPED;
  _oldHeader = nullptr;
  _newHeader = nullptr;

  return copy;
}
  
TRI_voc_fid_t DocumentOperation::getOldFid() const {
  TRI_ASSERT(_oldHeader != nullptr);
  return _oldHeader->getFid();
}
  
uint32_t DocumentOperation::getOldAlignedMarkerSize() const { 
  TRI_ASSERT(_oldHeader != nullptr);
  return _oldHeader->alignedMarkerSize();
}

void DocumentOperation::setVPack(TRI_df_marker_t const* marker) {
  TRI_ASSERT(_newHeader != nullptr);
  _newHeader->setVPackFromMarker(marker);
}

void DocumentOperation::setFid(TRI_voc_fid_t fid) {
  TRI_ASSERT(_newHeader != nullptr);
  _newHeader->setFid(fid, true); // always in WAL
}

void DocumentOperation::setHeader(TRI_doc_mptr_t const* oldHeader, 
                                  TRI_doc_mptr_t* newHeader) {
  TRI_ASSERT(_oldHeader == nullptr);
  TRI_ASSERT(_newHeader == nullptr);

  if (_type == TRI_VOC_DOCUMENT_OPERATION_INSERT) {
    TRI_ASSERT(oldHeader == nullptr);
    TRI_ASSERT(newHeader != nullptr);
    _oldHeader = nullptr;
    _newHeader = newHeader;
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
             _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
    TRI_ASSERT(oldHeader != nullptr);
    TRI_ASSERT(newHeader != nullptr);
    _oldHeader = oldHeader;
    _newHeader = newHeader;
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_REMOVE) {
    TRI_ASSERT(oldHeader != nullptr);
    TRI_ASSERT(newHeader == nullptr);
    _oldHeader = oldHeader;
    _newHeader = nullptr;
  }
}

void DocumentOperation::revert() {
  if (_status == StatusType::CREATED || 
      _status == StatusType::SWAPPED ||
      _status == StatusType::REVERTED) {
    return;
  }

  if (_status == StatusType::INDEXED || _status == StatusType::HANDLED) {
    _collection->rollbackOperation(_trx, _type, _oldHeader, _newHeader);
  }

  if (_type == TRI_VOC_DOCUMENT_OPERATION_INSERT) {
    TRI_ASSERT(_oldHeader == nullptr);
    TRI_ASSERT(_newHeader != nullptr);
    // remove now obsolete new revision
    _collection->getPhysical()->removeRevision(_newHeader->revisionId(), true);
  } else if (_type == TRI_VOC_DOCUMENT_OPERATION_UPDATE ||
             _type == TRI_VOC_DOCUMENT_OPERATION_REPLACE) {
    TRI_ASSERT(_oldHeader != nullptr);
    TRI_ASSERT(_newHeader != nullptr);
    IndexElement* element = _collection->primaryIndex()->lookupKey(_trx, Transaction::extractKeyFromDocument(VPackSlice(_newHeader->vpack())));
    if (element != nullptr) {
      element->revisionId(_oldHeader->revisionId());
    }
    
    // remove now obsolete new revision
    _collection->getPhysical()->removeRevision(_newHeader->revisionId(), true);
  }

  _status = StatusType::REVERTED;
}

