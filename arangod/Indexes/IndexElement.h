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

#ifndef ARANGOD_INDEXES_INDEX_ELEMENT_H
#define ARANGOD_INDEXES_INDEX_ELEMENT_H 1

#include "Basics/Common.h"
#include "Logger/Logger.h"
#include "VocBase/MasterPointer.h"
#include "VocBase/vocbase.h"
#include "VocBase/voc-types.h"

namespace arangodb {

namespace velocypack {
class Slice;
}

}

/// @brief velocypack sub-object (for indexes, as part of IndexElement, 
/// if the last byte in data[] is 0, then the VelocyPack data is managed 
/// by the index element. If the last byte in data[] is 1, then 
/// value.data contains the actual VelocyPack data in place.
struct TRI_vpack_sub_t {
  union {
    uint8_t data[16];
    uint8_t* managed;
  } value;
  
  /// @brief fill a TRI_vpack_sub_t structure with a subvalue
  void fill(VPackSlice const value) {
    VPackValueLength len = value.byteSize();
    if (len <= maxValueLength()) {
      setValue(value.start(), static_cast<size_t>(len));
    } else {
      setManaged(value.start(), static_cast<size_t>(len));
    }
  }

  void free() {
    if (isManaged()) {
      delete[] value.managed;
    }
  }
  
  /// @brief velocypack sub-object (for indexes, as part of IndexElement, 
  /// if offset is non-zero, then it is an offset into the VelocyPack data in
  /// the data or WAL file. If offset is 0, then data contains the actual data
  /// in place.
  arangodb::velocypack::Slice slice() const {
    if (isValue()) {
      return arangodb::velocypack::Slice(&value.data[0]);
    } 
    return arangodb::velocypack::Slice(value.managed);
  }

 private:
  void setManaged(uint8_t const* data, size_t length) {
    value.managed = new uint8_t[length];
    memcpy(value.managed, data, length);
    value.data[maxValueLength()] = 0; // type = offset
  }
    
  void setValue(uint8_t const* data, size_t length) noexcept {
    TRI_ASSERT(length > 0);
    TRI_ASSERT(length <= maxValueLength());
    memcpy(&value.data[0], data, length);
    value.data[maxValueLength()] = 1; // type = value
  }
  
  inline bool isManaged() const noexcept {
    return !isValue();
  }

  inline bool isValue() const noexcept {
    return value.data[maxValueLength()] == 1;
  }
  
  static constexpr size_t maxValueLength() noexcept {
    return sizeof(value.data) - 1;
  }
};

static_assert(sizeof(TRI_vpack_sub_t) == 16, "invalid size of TRI_vpack_sub_t");

/// @brief Unified index element. Do not directly construct it.
struct IndexElement {
 private:
  TRI_doc_mptr_t* _document;

  // Do not use new for this struct, use allocate!
  IndexElement() {}
  IndexElement(IndexElement const&) = delete;
  IndexElement& operator=(IndexElement const&) = delete;
  ~IndexElement() = delete;

 public:
  /// @brief get a pointer to the document's masterpointer
  TRI_doc_mptr_t* document() const { return _document; }

  /// @brief get the revision id of the document
  TRI_voc_rid_t revisionId() const { return _document->revisionId(); }
  
  inline TRI_vpack_sub_t const* subObject(size_t position) const {
    char const* p = reinterpret_cast<char const*>(this) + sizeof(TRI_doc_mptr_t*) + position * sizeof(TRI_vpack_sub_t);
    return reinterpret_cast<TRI_vpack_sub_t const*>(p);
  }
  
  inline arangodb::velocypack::Slice slice(size_t position) const {
    return subObject(position)->slice();
  }
  
  inline arangodb::velocypack::Slice slice() const {
    return slice(0);
  }

  uint64_t hashString(uint64_t seed) const {
    return slice(0).hashString(seed);
  }

  /// @brief allocate a new index element
  static IndexElement* allocate(TRI_doc_mptr_t const* mptr, std::vector<arangodb::velocypack::Slice> const& values) {
    TRI_ASSERT(!values.empty());

    IndexElement* element = allocate(mptr, values.size());

    if (element == nullptr) {
      return nullptr;
    }

    try {
      for (size_t i = 0; i < values.size(); ++i) {
        element->subObject(i)->fill(values[i]);
      }
      return element;
    } catch (...) {
      element->free(values.size());
      return nullptr;
    }
  }

  /// @brief allocate a new index element from a slice
  static IndexElement* allocate(TRI_doc_mptr_t const* mptr, arangodb::velocypack::Slice const& value) {
    IndexElement* element = allocate(mptr, 1);
    
    if (element == nullptr) {
      return nullptr;
    }

    try {
      element->subObject(0)->fill(value);
      return element;
    } catch (...) {
      element->free(1);
      return nullptr;
    }
  }

  void free(size_t numSubs) {
    for (size_t i = 0; i < numSubs; ++i) {
      subObject(i)->free();
    }
    TRI_Free(TRI_UNKNOWN_MEM_ZONE, this);
  }

  /// @brief memory usage of an index element
  static constexpr size_t memoryUsage(size_t numSubs) {
    return sizeof(TRI_doc_mptr_t*) + (sizeof(TRI_vpack_sub_t) * numSubs);
  }

 private:
  static IndexElement* allocate(TRI_doc_mptr_t const* mptr, size_t numSubs) {
    void* space = TRI_Allocate(TRI_UNKNOWN_MEM_ZONE, memoryUsage(numSubs), false);

    if (space == nullptr) {
      return nullptr;
    }

    // will not fail
    IndexElement* element = new (space) IndexElement();

    element->init(numSubs);
    element->document(mptr);

    return element;
  }

  /// @brief set the pointer to the document's masterpointer
  void document(TRI_doc_mptr_t const* doc) noexcept { _document = const_cast<TRI_doc_mptr_t*>(doc); }

  /// @brief set the pointer to the document's masterpointer
  void document(TRI_doc_mptr_t* doc) noexcept { _document = doc; }
  
  void init(size_t numSubs) {
    for (size_t i = 0; i < numSubs; ++i) {
      subObject(i)->fill(arangodb::velocypack::Slice::noneSlice());
    }
  }

  inline TRI_vpack_sub_t* subObject(size_t position) {
    char* p = reinterpret_cast<char*>(this) + sizeof(TRI_doc_mptr_t*) + position * sizeof(TRI_vpack_sub_t);
    return reinterpret_cast<TRI_vpack_sub_t*>(p);
  }
};

class IndexElementGuard {
 public:
  IndexElementGuard(IndexElement* element, size_t numSubs) : _element(element), _numSubs(numSubs) {}
  ~IndexElementGuard() {
    if (_element != nullptr) {
      _element->free(_numSubs);
    }
  }
  IndexElement* get() const { return _element; }
  IndexElement* release() { 
    IndexElement* tmp = _element;
    _element = nullptr;
    return tmp;
  }

  operator bool() const { return _element != nullptr; }
  
  bool operator==(nullptr_t) const { return _element == nullptr; }

 private:
  IndexElement* _element;
  size_t const _numSubs;
};

#endif
