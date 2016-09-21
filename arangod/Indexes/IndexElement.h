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
  // Do not use new for this struct, use create()!
 private:
  IndexElement(TRI_voc_rid_t revisionId, size_t numSubs); 

  IndexElement() = delete;
  IndexElement(IndexElement const&) = delete;
  IndexElement& operator=(IndexElement const&) = delete;
  ~IndexElement() = delete;

 public:
  /// @brief get the revision id of the document
  TRI_voc_rid_t revisionId() const { return _revisionId; }
  /// @brief set the revision id of the document
  void revisionId(TRI_voc_rid_t revisionId);
  
  inline TRI_vpack_sub_t const* subObject(size_t position) const {
    char const* p = reinterpret_cast<char const*>(this) + sizeof(TRI_voc_rid_t) + position * sizeof(TRI_vpack_sub_t);
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

  /// @brief allocate a new index element from a vector of slices
  static IndexElement* create(TRI_voc_rid_t revisionId, std::vector<arangodb::velocypack::Slice> const& values);
  
  /// @brief allocate a new index element from a slice
  static IndexElement* create(TRI_voc_rid_t revisionId, arangodb::velocypack::Slice const& value);

  void free(size_t numSubs);

  /// @brief memory usage of an index element
  static constexpr size_t memoryUsage(size_t numSubs) {
    return sizeof(TRI_voc_rid_t) + (sizeof(TRI_vpack_sub_t) * numSubs);
  }

 private:
  static IndexElement* create(TRI_voc_rid_t revisionId, size_t numSubs);

  inline TRI_vpack_sub_t* subObject(size_t position) {
    char* p = reinterpret_cast<char*>(this) + memoryUsage(position);
    return reinterpret_cast<TRI_vpack_sub_t*>(p);
  }
 
 private:
  TRI_voc_rid_t _revisionId;
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
