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

#include "Utils/AqlTransaction.h"

using namespace arangodb::aql;

ShortestPathBlock::ShortestPathBlock(ExecutionEngine* engine,
                                     ShortestPathNode const* ep)
    : ExecutionBlock(engine, ep),
      _vertexVar(nullptr),
      _edgeVar(nullptr),
      _opts(_trx) {}

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
#warning TODO Reset internal variables
  return ExecutionBlock::initializeCursor(items, pos);
}

void ShortestPathBlock::nextPath() {
#warning TODO IMPLEMENT
  // _opts.setStart();
  // _opts.setEnd();
}

AqlItemBlock* ShortestPathBlock::getSome(size_t, size_t atMost) {
  // _opts.direction = ep->direction;
#warning TODO


  /*
std::unique_ptr<ArangoDBConstDistancePathFinder::Path> path =
    TRI_RunSimpleShortestPathSearch(_collectionInfos, _trx, _opts);
TRI_RunSimpleShortestPathSearch(
    std::vector<EdgeCollectionInfo*> const& collectionInfos,
    arangodb::Transaction* trx,
    ShortestPathOptions& opts) {
    */
  return nullptr;
}

size_t ShortestPathBlock::skipSome(size_t, size_t atMost) {
  return 0;
}

