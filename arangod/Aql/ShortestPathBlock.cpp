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
/// @author Michael Hackstein
////////////////////////////////////////////////////////////////////////////////

#include "ShortestPathBlock.h"

#include "Aql/ExecutionEngine.h"
#include "Aql/ExecutionPlan.h"
#include "Utils/AqlTransaction.h"
#include "Utils/OperationCursor.h"
#include "Utils/Transaction.h"

using namespace arangodb::aql;

////////////////////////////////////////////////////////////////////////////////
/// @brief Define edge weight by the number of hops.
///        Respectively 1 for any edge.
////////////////////////////////////////////////////////////////////////////////

class HopWeightCalculator {
 public:
  HopWeightCalculator(){};

  //////////////////////////////////////////////////////////////////////////////
  /// @brief Callable weight calculator for edge
  //////////////////////////////////////////////////////////////////////////////

  double operator()(VPackSlice const edge) { return 1; }
};

////////////////////////////////////////////////////////////////////////////////
/// @brief Define edge weight by ony special attribute.
///        Respectively 1 for any edge.
////////////////////////////////////////////////////////////////////////////////

class AttributeWeightCalculator {
  std::string const _attribute;
  double const _defaultWeight;

 public:
  AttributeWeightCalculator(std::string const& attribute, double defaultWeight)
      : _attribute(attribute), _defaultWeight(defaultWeight) {}

  //////////////////////////////////////////////////////////////////////////////
  /// @brief Callable weight calculator for edge
  //////////////////////////////////////////////////////////////////////////////

  double operator()(VPackSlice const edge) {
    if (_attribute.empty()) {
      return _defaultWeight;
    }

    VPackSlice attr = edge.get(_attribute);
    if (!attr.isNumber()) {
      return _defaultWeight;
    }
    return attr.getNumericValue<double>();
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @brief Local class to expand edges.
///        Will be handed over to the path finder
////////////////////////////////////////////////////////////////////////////////

struct ConstDistanceExpanderLocal {
 private:
  std::vector<EdgeCollectionInfo*> const _colls;
  bool _isReverse;
  std::vector<TRI_doc_mptr_t*> _cursor;

 public:
  ConstDistanceExpanderLocal(std::vector<EdgeCollectionInfo*> const& colls,
                             bool isReverse)
      : _colls(colls), _isReverse(isReverse) {}

  void operator()(VPackSlice const& v, std::vector<VPackSlice>& res_edges,
                  std::vector<VPackSlice>& neighbors) {
    for (auto const& edgeCollection : _colls) {
      _cursor.clear();
      TRI_ASSERT(edgeCollection != nullptr);
      std::shared_ptr<arangodb::OperationCursor> edgeCursor;
      if (_isReverse) {
        edgeCursor = edgeCollection->getReverseEdges(v);
      } else {
         edgeCursor = edgeCollection->getEdges(v);
      }
      while (edgeCursor->hasMore()) {
        edgeCursor->getMoreMptr(_cursor, UINT64_MAX);
        for (auto const& mptr : _cursor) {
          VPackSlice edge(mptr->vpack());
          VPackSlice from = arangodb::Transaction::extractFromFromDocument(edge);
          if (from == v) {
            VPackSlice to = arangodb::Transaction::extractToFromDocument(edge);
            if (to != v) {
              res_edges.emplace_back(edge);
              neighbors.emplace_back(to);
            }
          } else {
            res_edges.emplace_back(edge);
            neighbors.emplace_back(from);
          }
        }
      }
    }
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @brief Expander for weighted edges
////////////////////////////////////////////////////////////////////////////////

struct EdgeWeightExpanderLocal {

 private:
  //////////////////////////////////////////////////////////////////////////////
  /// @brief all info required for edge collection
  //////////////////////////////////////////////////////////////////////////////

  std::vector<EdgeCollectionInfo*> _edgeCollections;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief Defines if this expander follows the edges in reverse
  //////////////////////////////////////////////////////////////////////////////

  bool _reverse;

 public:
  EdgeWeightExpanderLocal(
      std::vector<EdgeCollectionInfo*> const& edgeCollections, bool reverse)
      : _edgeCollections(edgeCollections), _reverse(reverse) {}

  void operator()(VPackSlice const& source,
                  std::vector<ArangoDBPathFinder::Step*>& result) {
    std::vector<TRI_doc_mptr_t*> cursor;
    std::shared_ptr<arangodb::OperationCursor> edgeCursor;
    for (auto const& edgeCollection : _edgeCollections) {
      TRI_ASSERT(edgeCollection != nullptr);

      if (_reverse) {
        edgeCursor = edgeCollection->getReverseEdges(source);
      } else {
        edgeCursor = edgeCollection->getEdges(source);
      }
      std::unordered_map<VPackSlice, size_t> candidates;

      auto inserter = [&](VPackSlice const& s, VPackSlice const& t,
                          double currentWeight, VPackSlice edge) {
        auto cand = candidates.find(t);
        if (cand == candidates.end()) {
          // Add weight
          auto step = std::make_unique<ArangoDBPathFinder::Step>(
              t, s, currentWeight, std::move(edge));
          result.emplace_back(step.release());
          candidates.emplace(t, result.size() - 1);
        } else {
          // Compare weight
          auto oldWeight = result[cand->second]->weight();
          if (currentWeight < oldWeight) {
            result[cand->second]->setWeight(currentWeight);
          }
        }
      };
      
      cursor.clear();
      while (edgeCursor->hasMore()) {
        edgeCursor->getMoreMptr(cursor, UINT64_MAX);
        for (auto const& mptr : cursor) {
          VPackSlice edge(mptr->vpack());
          VPackSlice from = arangodb::Transaction::extractFromFromDocument(edge);
          VPackSlice to = arangodb::Transaction::extractToFromDocument(edge);
          double currentWeight = edgeCollection->weightEdge(edge);
          if (from == source) {
            inserter(from, to, currentWeight, edge);
          } else {
            inserter(to, from, currentWeight, edge);
          }
        }
      }
    }
  }
};

ShortestPathBlock::ShortestPathBlock(ExecutionEngine* engine,
                                     ShortestPathNode const* ep)
    : ExecutionBlock(engine, ep),
      _vertexVar(nullptr),
      _edgeVar(nullptr),
      _opts(_trx),
      _posInPath(0),
      _pathLength(0),
      _path(nullptr),
      _useStartRegister(false),
      _useTargetRegister(false),
      _usedConstant(false) {

  ep->fillOptions(_opts);

  size_t count = ep->_edgeColls.size();
  TRI_ASSERT(ep->_directions.size());
  _collectionInfos.reserve(count);

  std::function<double(arangodb::velocypack::Slice const)> weighter;
  if (_opts.useWeight) {
    TRI_ASSERT(!_opts.weightAttribute.empty());
    weighter = [this](VPackSlice const edge) {
      VPackSlice attr = edge.get(_opts.weightAttribute);
      if (!attr.isNumber()) {
        return _opts.defaultWeight;
      }
      return attr.getNumericValue<double>();
    };
  } else {
    weighter = [](VPackSlice const) { return 1; };
  }
  for (size_t j = 0; j < count; ++j) {
    auto info =
        std::make_unique<EdgeCollectionInfo>(
            _trx, ep->_edgeColls[j], ep->_directions[j], weighter);
    _collectionInfos.emplace_back(info.get());
    info.release();
  }

  if (!ep->usesStartInVariable()) {
    _startVertexId = ep->getStartVertex();
  } else {
    auto it = ep->getRegisterPlan()->varInfo.find(ep->startInVariable()->id);
    TRI_ASSERT(it != ep->getRegisterPlan()->varInfo.end());
    _startReg = it->second.registerId;
    _useStartRegister = true;
  }

  if (!ep->usesTargetInVariable()) {
    _targetVertexId = ep->getTargetVertex();
  } else {
    auto it = ep->getRegisterPlan()->varInfo.find(ep->targetInVariable()->id);
    TRI_ASSERT(it != ep->getRegisterPlan()->varInfo.end());
    _targetReg = it->second.registerId;
    _useTargetRegister = true;
  }

  if (ep->usesVertexOutVariable()) {
    _vertexVar = ep->vertexOutVariable();
  }

  if (ep->usesEdgeOutVariable()) {
    _edgeVar = ep->edgeOutVariable();
  }
  _path = std::make_unique<arangodb::traverser::ShortestPath>();

  if (arangodb::ServerState::instance()->isCoordinator()) {
    // TODO COORDINATOR
    THROW_ARANGO_EXCEPTION(TRI_ERROR_NOT_IMPLEMENTED);
  } else {
    if (_opts.useWeight) {
      auto fwExpander = EdgeWeightExpanderLocal(_collectionInfos, false);
      auto bwExpander = EdgeWeightExpanderLocal(_collectionInfos, true);
      _finder.reset(new arangodb::basics::DynamicDistanceFinder<
                    arangodb::velocypack::Slice, arangodb::velocypack::Slice,
                    double, arangodb::traverser::ShortestPath>(
          fwExpander, bwExpander, _opts.bidirectional));
    } else {
      auto fwExpander = ConstDistanceExpanderLocal(_collectionInfos, false);
      auto bwExpander = ConstDistanceExpanderLocal(_collectionInfos, true);
      _finder.reset(new arangodb::basics::ConstDistanceFinder<arangodb::velocypack::Slice,
                                              arangodb::velocypack::Slice,
                                              arangodb::basics::VelocyPackHelper::VPackStringHash, 
                                              arangodb::basics::VelocyPackHelper::VPackStringEqual,
                                              arangodb::traverser::ShortestPath>(fwExpander, bwExpander));
    }
  }
}

ShortestPathBlock::~ShortestPathBlock() {
}

int ShortestPathBlock::initialize() {
  DEBUG_BEGIN_BLOCK();
  int res = ExecutionBlock::initialize();
  auto varInfo = getPlanNode()->getRegisterPlan()->varInfo;

  if (usesVertexOutput()) {
    TRI_ASSERT(_vertexVar != nullptr);
    auto it = varInfo.find(_vertexVar->id);
    TRI_ASSERT(it != varInfo.end());
    TRI_ASSERT(it->second.registerId < ExecutionNode::MaxRegisterId);
    _vertexReg = it->second.registerId;
  }
  if (usesEdgeOutput()) {
    TRI_ASSERT(_edgeVar != nullptr);
    auto it = varInfo.find(_edgeVar->id);
    TRI_ASSERT(it != varInfo.end());
    TRI_ASSERT(it->second.registerId < ExecutionNode::MaxRegisterId);
    _edgeReg = it->second.registerId;
  }

  return res;
  DEBUG_END_BLOCK();
}

int ShortestPathBlock::initializeCursor(AqlItemBlock* items, size_t pos) {
  _posInPath = 0;
  _pathLength = 0;
  _usedConstant = false;
  return ExecutionBlock::initializeCursor(items, pos);
}

bool ShortestPathBlock::nextPath(AqlItemBlock const* items) {
  if (_usedConstant) {
    // Both source and target are constant.
    // Just one path to compute
    return false;
  }
  _path->clear();
  if (!_useStartRegister && !_useTargetRegister) {
    // Both are constant, after this computation we are done
    _usedConstant = true;
  }
  if (!_useStartRegister) {
    auto pos = _startVertexId.find("/");
    if (pos == std::string::npos) {
      _engine->getQuery()->registerWarning(TRI_ERROR_BAD_PARAMETER,
                                           "Invalid input for Shortest Path: "
                                           "Only id strings or objects with "
                                           "_id are allowed");
      return false;
    } else {
      _opts.setStart(_startVertexId);
    }
  } else {
    AqlValue const& in = items->getValueReference(_pos, _startReg);
    if (in.isObject()) {
      try {
        std::string idString = _trx->extractIdString(in.slice());
        _opts.setStart(idString);
      }
      catch (...) {
        // _id or _key not present... ignore this error and fall through
        // returning no path
        return false;
      }
    } else if (in.isString()) {
      _startVertexId = in.slice().copyString();
      _opts.setStart(_startVertexId);
    } else {
      _engine->getQuery()->registerWarning(
          TRI_ERROR_BAD_PARAMETER, "Invalid input for Shortest Path: Only "
                                       "id strings or objects with _id are "
                                       "allowed");
      return false;
    }

  }

  if (!_useTargetRegister) {
    auto pos = _targetVertexId.find("/");
    if (pos == std::string::npos) {
      _engine->getQuery()->registerWarning(
          TRI_ERROR_BAD_PARAMETER, "Invalid input for Shortest Path: "
                                       "Only id strings or objects with "
                                       "_id are allowed");
      return false;
    } else {
      _opts.setEnd(_targetVertexId);
    }
  } else {
    AqlValue const& in = items->getValueReference(_pos, _targetReg);
    if (in.isObject()) {
      try {
        std::string idString = _trx->extractIdString(in.slice());
        _opts.setEnd(idString);
      }
      catch (...) {
        // _id or _key not present... ignore this error and fall through
        // returning no path
        return false;
      }
    } else if (in.isString()) {
      _targetVertexId = in.slice().copyString();
      _opts.setEnd(_targetVertexId);
    } else {
      _engine->getQuery()->registerWarning(
          TRI_ERROR_BAD_PARAMETER, "Invalid input for Shortest Path: Only "
                                       "id strings or objects with _id are "
                                       "allowed");
      return false;
    }
  }

  VPackSlice start = _opts.getStart();
  VPackSlice end = _opts.getEnd();
  TRI_ASSERT(_finder != nullptr);
  bool hasPath = _finder->shortestPath(start, end, *_path);

  if (hasPath) {
    _posInPath = 0;
    _pathLength = _path->length();
  }

  return hasPath;
}

AqlItemBlock* ShortestPathBlock::getSome(size_t, size_t atMost) {
  DEBUG_BEGIN_BLOCK();
  if (_done) {
    return nullptr;
  }

  if (_buffer.empty()) {
    size_t toFetch = (std::min)(DefaultBatchSize(), atMost);
    if (!ExecutionBlock::getBlock(toFetch, toFetch)) {
      _done = true;
      return nullptr;
    }
    _pos = 0;  // this is in the first block
  }

  // If we get here, we do have _buffer.front()
  AqlItemBlock* cur = _buffer.front();
  size_t const curRegs = cur->getNrRegs();

  // Collect the next path:
  if (_posInPath >= _pathLength) {
    if (!nextPath(cur)) {
      // This input does not have any path. maybe the next one has.
      // we can only return nullptr iff the buffer is empty.
      if (++_pos >= cur->size()) {
        _buffer.pop_front();  // does not throw
        delete cur;
        _pos = 0;
      }
      return getSome(atMost, atMost);
    }
  }

  size_t available = _pathLength - _posInPath;
  size_t toSend = (std::min)(atMost, available);

  RegisterId nrRegs =
      getPlanNode()->getRegisterPlan()->nrRegs[getPlanNode()->getDepth()];
  std::unique_ptr<AqlItemBlock> res(requestBlock(toSend, nrRegs));
  // automatically freed if we throw
  TRI_ASSERT(curRegs <= res->getNrRegs());

  // only copy 1st row of registers inherited from previous frame(s)
  inheritRegisters(cur, res.get(), _pos);

  // TODO this might be optimized in favor of direct mptr.
  VPackBuilder resultBuilder;
  for (size_t j = 0; j < toSend; j++) {
    if (j > 0) {
      // re-use already copied aqlvalues
      for (RegisterId i = 0; i < curRegs; i++) {
        res->setValue(j, i, res->getValueReference(0, i));
        // Note: if this throws, then all values will be deleted
        // properly since the first one is.
      }
    }
    if (usesVertexOutput()) {
      // TODO this might be optimized in favor of direct mptr.
      resultBuilder.clear();
      _path->vertexToVelocyPack(_trx, _posInPath, resultBuilder);
      res->setValue(j, _vertexReg, AqlValue(resultBuilder.slice()));
    }
    if (usesEdgeOutput()) {
      // TODO this might be optimized in favor of direct mptr.
      resultBuilder.clear();
      _path->edgeToVelocyPack(_trx, _posInPath, resultBuilder);
      res->setValue(j, _edgeReg, AqlValue(resultBuilder.slice()));
    }
    ++_posInPath;
  }

  if (_posInPath >= _pathLength) {
    // Advance read position for next call
    if (++_pos >= cur->size()) {
      _buffer.pop_front();  // does not throw
      delete cur;
      _pos = 0;
    }
  }

  // Clear out registers no longer needed later:
  clearRegisters(res.get());
  return res.release();
  DEBUG_END_BLOCK();
}

size_t ShortestPathBlock::skipSome(size_t, size_t atMost) {
  return 0;
}

