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
/// @author Dr. Frank Celler
////////////////////////////////////////////////////////////////////////////////

#include "PrimaryIndex.h"
#include "Aql/AstNode.h"
#include "Basics/Exceptions.h"
#include "Basics/StaticStrings.h"
#include "Basics/hashes.h"
#include "Basics/tri-strings.h"
#include "Indexes/SimpleAttributeEqualityMatcher.h"
#include "Utils/Transaction.h"
#include "Utils/TransactionContext.h"
#include "VocBase/LogicalCollection.h"
#include "VocBase/transaction.h"

#include <velocypack/Builder.h>
#include <velocypack/Collection.h>
#include <velocypack/Slice.h>
#include <velocypack/velocypack-aliases.h>

using namespace arangodb;

static constexpr uint64_t hashSeed = 0x87654321;

/// @brief hard-coded vector of the index attributes
/// note that the attribute names must be hard-coded here to avoid an init-order
/// fiasco with StaticStrings::FromString etc.
static std::vector<std::vector<arangodb::basics::AttributeName>> const IndexAttributes
    {{arangodb::basics::AttributeName("_id", false)},
     {arangodb::basics::AttributeName("_key", false)}};

static inline uint64_t HashKey(void*, uint8_t const* key) {
  // can use fast hash-function here, as index values are restricted to strings
  return VPackSlice(key).hashString(hashSeed);
}

static inline uint64_t HashElement(void*, IndexElement const* element) {
  return element->hashString(hashSeed);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief determines if a key corresponds to an element
////////////////////////////////////////////////////////////////////////////////

static bool IsEqualKeyElement(void*, uint8_t const* key,
                              uint64_t hash,
                              IndexElement const* element) {
  if (hash != element->hashString(hashSeed)) {
    return false;
  }

  return element->slice().equals(VPackSlice(key)); 
}

////////////////////////////////////////////////////////////////////////////////
/// @brief determines if two elements are equal
////////////////////////////////////////////////////////////////////////////////

static bool IsEqualElementElement(void*, IndexElement const* left,
                                  IndexElement const* right) {
  if (left->hashString(hashSeed) != right->hashString(hashSeed)) {
    return false;
  }

  return left->slice().equals(right->slice());
}

PrimaryIndexIterator::~PrimaryIndexIterator() {
  if (_keys != nullptr) {
    // return the VPackBuilder to the transaction context 
    _trx->transactionContextPtr()->returnBuilder(_keys.release());
  }
}

IndexElement* PrimaryIndexIterator::next() {
  while (_iterator.valid()) {
    auto result = _index->lookupKey(_trx, _iterator.value());
    _iterator.next();

    if (result != nullptr) {
      // found a result
      return result;
    }

    // found no result. now go to next lookup value in _keys
  }

  return nullptr;
}

void PrimaryIndexIterator::reset() { _iterator.reset(); }

IndexElement* AllIndexIterator::next() {
  if (_reverse) {
    return _index->findSequentialReverse(_trx, _position);
  }
  return _index->findSequential(_trx, _position, _total);
};

void AllIndexIterator::nextBabies(std::vector<IndexElement*>& buffer, size_t limit) {
  size_t atMost = limit;

  buffer.clear();

  while (atMost > 0) {
    auto result = next();

    if (result == nullptr) {
      return;
    }

    buffer.emplace_back(result);
    --atMost;
  }
}

void AllIndexIterator::reset() { _position.reset(); }

IndexElement* AnyIndexIterator::next() {
  return _index->findRandom(_trx, _initial, _position, _step, _total);
}

void AnyIndexIterator::reset() {
  _step = 0;
  _total = 0;
  _position = _initial;
}


PrimaryIndex::PrimaryIndex(arangodb::LogicalCollection* collection)
    : Index(0, collection,
            std::vector<std::vector<arangodb::basics::AttributeName>>(
                {{arangodb::basics::AttributeName(StaticStrings::KeyString, false)}}),
            true, false),
      _primaryIndex(nullptr),
      _extraMemory(0) {
  uint32_t indexBuckets = 1;

  if (collection != nullptr) {
    // collection is a nullptr in the coordinator case
    indexBuckets = collection->indexBuckets();
  }

  _primaryIndex = new PrimaryIndexImpl(
      HashKey, HashElement, IsEqualKeyElement, IsEqualElementElement,
      IsEqualElementElement, indexBuckets,
      []() -> std::string { return "primary"; });
}

PrimaryIndex::~PrimaryIndex() { 
  if (_primaryIndex != nullptr) {
    auto cb = [this](IndexElement* element) -> bool { 
      element->free(1);
      return true; 
    };

    // must invoke the free callback on all index elements to prevent leaks :snake:
    _primaryIndex->invokeOnAllElements(cb);
  } 
  delete _primaryIndex; 
}

////////////////////////////////////////////////////////////////////////////////
/// @brief return the number of documents from the index
////////////////////////////////////////////////////////////////////////////////

size_t PrimaryIndex::size() const { return _primaryIndex->size(); }

////////////////////////////////////////////////////////////////////////////////
/// @brief return the memory usage of the index
////////////////////////////////////////////////////////////////////////////////

size_t PrimaryIndex::memory() const { 
  return _primaryIndex->memoryUsage() + _extraMemory; 
}

////////////////////////////////////////////////////////////////////////////////
/// @brief return a VelocyPack representation of the index
////////////////////////////////////////////////////////////////////////////////

void PrimaryIndex::toVelocyPack(VPackBuilder& builder, bool withFigures) const {
  Index::toVelocyPack(builder, withFigures);
  // hard-coded
  builder.add("unique", VPackValue(true));
  builder.add("sparse", VPackValue(false));
}

/// @brief return a VelocyPack representation of the index figures
void PrimaryIndex::toVelocyPackFigures(VPackBuilder& builder) const {
  Index::toVelocyPackFigures(builder);
  _primaryIndex->appendToVelocyPack(builder);
}

int PrimaryIndex::insert(arangodb::Transaction*, TRI_voc_rid_t, VPackSlice const&, bool) {
#ifdef ARANGODB_ENABLE_MAINTAINER_MODE
  LOG(WARN) << "insert() called for primary index";
#endif
  THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_INTERNAL, "insert() called for primary index");
}

int PrimaryIndex::remove(arangodb::Transaction*, TRI_voc_rid_t, VPackSlice const&, bool) {
#ifdef ARANGODB_ENABLE_MAINTAINER_MODE
  LOG(WARN) << "remove() called for primary index";
#endif
  THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_INTERNAL, "remove() called for primary index");
}

/// @brief unload the index data from memory
int PrimaryIndex::unload() {
  auto cb = [](IndexElement* element) {
    element->free(1);
    return true;
  };

  _primaryIndex->truncate(cb);
  _extraMemory = 0;

  return TRI_ERROR_NO_ERROR;
}

/// @brief looks up an element given a key
IndexElement* PrimaryIndex::lookup(arangodb::Transaction* trx,
                                   VPackSlice const& slice) const {
  TRI_ASSERT(slice.isArray() && slice.length() == 1);
  VPackSlice tmp = slice.at(0);
  TRI_ASSERT(tmp.isObject() && tmp.hasKey(StaticStrings::IndexEq));
  tmp = tmp.get(StaticStrings::IndexEq);
  return _primaryIndex->findByKey(trx, tmp.begin());
}

/// @brief looks up an element given a key
IndexElement* PrimaryIndex::lookupKey(arangodb::Transaction* trx,
                                      VPackSlice const& key) const {
  TRI_ASSERT(key.isString());
  return _primaryIndex->findByKey(trx, key.begin());
}

////////////////////////////////////////////////////////////////////////////////
/// @brief a method to iterate over all elements in the index in
///        a sequential order.
///        Returns nullptr if all documents have been returned.
///        Convention: position === 0 indicates a new start.
///        DEPRECATED
////////////////////////////////////////////////////////////////////////////////

IndexElement* PrimaryIndex::lookupSequential(
    arangodb::Transaction* trx, arangodb::basics::BucketPosition& position,
    uint64_t& total) {
  return _primaryIndex->findSequential(trx, position, total);
}

//////////////////////////////////////////////////////////////////////////////
/// @brief request an iterator over all elements in the index in
///        a sequential order.
//////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::allIterator(arangodb::Transaction* trx,
                                         bool reverse) const {
  return new AllIndexIterator(_collection, trx, _primaryIndex, reverse);
}

//////////////////////////////////////////////////////////////////////////////
/// @brief request an iterator over all elements in the index in
///        a random order. It is guaranteed that each element is found
///        exactly once unless the collection is modified.
//////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::anyIterator(arangodb::Transaction* trx) const {
  return new AnyIndexIterator(_collection, trx, _primaryIndex);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief a method to iterate over all elements in the index in
///        reversed sequential order.
///        Returns nullptr if all documents have been returned.
///        Convention: position === UINT64_MAX indicates a new start.
///        DEPRECATED
////////////////////////////////////////////////////////////////////////////////

IndexElement* PrimaryIndex::lookupSequentialReverse(
    arangodb::Transaction* trx, arangodb::basics::BucketPosition& position) {
  return _primaryIndex->findSequentialReverse(trx, position);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief adds a key/element to the index
/// returns a status code, and *found will contain a found element (if any)
////////////////////////////////////////////////////////////////////////////////

int PrimaryIndex::insertKey(arangodb::Transaction* trx, TRI_voc_rid_t revisionId, VPackSlice const& doc) {
  IndexElementGuard element(buildKeyElement(revisionId, doc.begin()), 1);
  if (element == nullptr) {
    return TRI_ERROR_OUT_OF_MEMORY;
  }

  int res = _primaryIndex->insert(trx, element.get());
  
  if (res == TRI_ERROR_NO_ERROR) {
    // ownership transfer
    _extraMemory += element->totalMemoryUsage(1);
    element.release();
  }

  return res;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief removes an key/element from the index
////////////////////////////////////////////////////////////////////////////////

int PrimaryIndex::removeKey(arangodb::Transaction* trx,
                            TRI_voc_rid_t revisionId, VPackSlice const& doc) {
  IndexElementGuard element(buildKeyElement(revisionId, doc.begin()), 1);
  if (element == nullptr) {
    return TRI_ERROR_OUT_OF_MEMORY;
  }

  uint8_t const* key = element.get()->slice().begin();
  
  IndexElementGuard found(_primaryIndex->removeByKey(trx, key), 1);

  if (found == nullptr) {
    return TRI_ERROR_ARANGO_DOCUMENT_NOT_FOUND;
  }
    
  _extraMemory -= found->totalMemoryUsage(1);

  return TRI_ERROR_NO_ERROR;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief resizes the index
////////////////////////////////////////////////////////////////////////////////

int PrimaryIndex::resize(arangodb::Transaction* trx, size_t targetSize) {
  return _primaryIndex->resize(trx, targetSize);
}

void PrimaryIndex::invokeOnAllElements(
    std::function<bool(IndexElement*)> work) {
  _primaryIndex->invokeOnAllElements(work);
}

void PrimaryIndex::invokeOnAllElementsForRemoval(
    std::function<bool(IndexElement*)> work) {
  _primaryIndex->invokeOnAllElementsForRemoval(work);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief checks whether the index supports the condition
////////////////////////////////////////////////////////////////////////////////

bool PrimaryIndex::supportsFilterCondition(
    arangodb::aql::AstNode const* node,
    arangodb::aql::Variable const* reference, size_t itemsInIndex,
    size_t& estimatedItems, double& estimatedCost) const {

  SimpleAttributeEqualityMatcher matcher(IndexAttributes);
  return matcher.matchOne(this, node, reference, itemsInIndex, estimatedItems,
                          estimatedCost);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief creates an IndexIterator for the given Condition
////////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::iteratorForCondition(
    arangodb::Transaction* trx, IndexIteratorContext* context,
    arangodb::aql::AstNode const* node,
    arangodb::aql::Variable const* reference, bool reverse) const {
  TRI_ASSERT(node->type == aql::NODE_TYPE_OPERATOR_NARY_AND);

  TRI_ASSERT(node->numMembers() == 1);

  auto comp = node->getMember(0);

  // assume a.b == value
  auto attrNode = comp->getMember(0);
  auto valNode = comp->getMember(1);

  if (attrNode->type != aql::NODE_TYPE_ATTRIBUTE_ACCESS) {
    // value == a.b  ->  flip the two sides
    attrNode = comp->getMember(1);
    valNode = comp->getMember(0);
  }
  TRI_ASSERT(attrNode->type == aql::NODE_TYPE_ATTRIBUTE_ACCESS);

  if (comp->type == aql::NODE_TYPE_OPERATOR_BINARY_EQ) {
    // a.b == value
    return createEqIterator(trx, context, attrNode, valNode);
  } else if (comp->type == aql::NODE_TYPE_OPERATOR_BINARY_IN) {
    // a.b IN values
    if (!valNode->isArray()) {
      return nullptr;
    }

    return createInIterator(trx, context, attrNode, valNode);
  }

  // operator type unsupported
  return nullptr;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief creates an IndexIterator for the given slice
////////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::iteratorForSlice(
    arangodb::Transaction* trx, IndexIteratorContext* ctxt,
    arangodb::velocypack::Slice const searchValues, bool) const {
  if (!searchValues.isArray()) {
    // Invalid searchValue
    return nullptr;
  }
  // lease builder, but immediately pass it to the unique_ptr so we don't leak  
  TransactionBuilderLeaser builder(trx);
  std::unique_ptr<VPackBuilder> keys(builder.steal());
  builder->add(searchValues);
  return new PrimaryIndexIterator(_collection, trx, this, keys);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief specializes the condition for use with the index
////////////////////////////////////////////////////////////////////////////////

arangodb::aql::AstNode* PrimaryIndex::specializeCondition(
    arangodb::aql::AstNode* node,
    arangodb::aql::Variable const* reference) const {

  SimpleAttributeEqualityMatcher matcher(IndexAttributes);
  return matcher.specializeOne(this, node, reference);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief create the iterator, for a single attribute, IN operator
////////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::createInIterator(
    arangodb::Transaction* trx, IndexIteratorContext* context,
    arangodb::aql::AstNode const* attrNode,
    arangodb::aql::AstNode const* valNode) const {
  // _key or _id?
  bool const isId = (attrNode->stringEquals(StaticStrings::IdString));
    
  TRI_ASSERT(valNode->isArray());
  
  // lease builder, but immediately pass it to the unique_ptr so we don't leak  
  TransactionBuilderLeaser builder(trx);
  std::unique_ptr<VPackBuilder> keys(builder.steal());
  keys->openArray();
  
  size_t const n = valNode->numMembers();

  // only leave the valid elements
  for (size_t i = 0; i < n; ++i) {
    handleValNode(context, keys.get(), valNode->getMemberUnchecked(i), isId);
    TRI_IF_FAILURE("PrimaryIndex::iteratorValNodes") {
      THROW_ARANGO_EXCEPTION(TRI_ERROR_DEBUG);
    }
  }
  
  TRI_IF_FAILURE("PrimaryIndex::noIterator") {
    THROW_ARANGO_EXCEPTION(TRI_ERROR_DEBUG);
  }
  keys->close();
  return new PrimaryIndexIterator(_collection, trx, this, keys);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief create the iterator, for a single attribute, EQ operator
////////////////////////////////////////////////////////////////////////////////

IndexIterator* PrimaryIndex::createEqIterator(
    arangodb::Transaction* trx, IndexIteratorContext* context,
    arangodb::aql::AstNode const* attrNode,
    arangodb::aql::AstNode const* valNode) const {
  // _key or _id?
  bool const isId = (attrNode->stringEquals(StaticStrings::IdString));

  // lease builder, but immediately pass it to the unique_ptr so we don't leak  
  TransactionBuilderLeaser builder(trx);
  std::unique_ptr<VPackBuilder> keys(builder.steal());
  keys->openArray();

  // handle the sole element
  handleValNode(context, keys.get(), valNode, isId);

  TRI_IF_FAILURE("PrimaryIndex::noIterator") {
    THROW_ARANGO_EXCEPTION(TRI_ERROR_DEBUG);
  }
  keys->close();
  return new PrimaryIndexIterator(_collection, trx, this, keys);
}

////////////////////////////////////////////////////////////////////////////////
/// @brief add a single value node to the iterator's keys
////////////////////////////////////////////////////////////////////////////////
   
void PrimaryIndex::handleValNode(IndexIteratorContext* context,
                                 VPackBuilder* keys,
                                 arangodb::aql::AstNode const* valNode,
                                 bool isId) const { 
  if (!valNode->isStringValue() || valNode->getStringLength() == 0) {
    return;
  }

  if (isId) {
    // lookup by _id. now validate if the lookup is performed for the
    // correct collection (i.e. _collection)
    TRI_voc_cid_t cid;
    char const* key;
    size_t outLength;
    int res = context->resolveId(valNode->getStringValue(), valNode->getStringLength(), cid, key, outLength);

    if (res != TRI_ERROR_NO_ERROR) {
      return;
    }

    TRI_ASSERT(cid != 0);
    TRI_ASSERT(key != nullptr);

    if (!context->isCluster() && cid != _collection->cid()) {
      // only continue lookup if the id value is syntactically correct and
      // refers to "our" collection, using local collection id
      return;
    }

    if (context->isCluster() && cid != _collection->planId()) {
      // only continue lookup if the id value is syntactically correct and
      // refers to "our" collection, using cluster collection id
      return;
    }

    // use _key value from _id
    keys->add(VPackValuePair(key, outLength, VPackValueType::String));
  } else {
    keys->add(VPackValuePair(valNode->getStringValue(), valNode->getStringLength(), VPackValueType::String));
  }
}

IndexElement* PrimaryIndex::buildKeyElement(TRI_voc_rid_t revisionId, uint8_t const* vpack) const {
  return buildStringElement(revisionId, Transaction::extractKeyFromDocument(VPackSlice(vpack)));
}
