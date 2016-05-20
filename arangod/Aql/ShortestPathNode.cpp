/// @brief Implementation of Shortest Path Execution Node
///
/// @file arangod/Aql/ShortestPathNode.cpp
///
/// DISCLAIMER
///
/// Copyright 2010-2014 triagens GmbH, Cologne, Germany
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
/// @author Copyright 2015, ArangoDB GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

#include "Aql/ShortestPathNode.h"
#include "Aql/Ast.h"
#include "Aql/ExecutionPlan.h"

using namespace arangodb::basics;
using namespace arangodb::aql;

static void parseNodeInput(AstNode const* node, std::string& id,
                           Variable*& variable) {
  switch (node->type) {
    case NODE_TYPE_REFERENCE:
      variable = static_cast<Variable*>(node->getData());
      id = "";
      break;
    case NODE_TYPE_VALUE:
      if (node->value.type != VALUE_TYPE_STRING) {
        THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_QUERY_PARSE,
                                       "invalid start vertex. Must either be "
                                       "an _id string or an object with _id.");
      }
      variable = nullptr;
      id = node->getString();
      break;
    default:
      THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_QUERY_PARSE,
                                     "invalid start vertex. Must either be an "
                                     "_id string or an object with _id.");
  }
}

static TRI_edge_direction_e parseDirection (uint64_t const dirNum) {
  switch (dirNum) {
    case 0:
      return TRI_EDGE_ANY;
    case 1:
      return TRI_EDGE_IN;
    case 2:
      return TRI_EDGE_OUT;
    default:
      THROW_ARANGO_EXCEPTION_MESSAGE(
          TRI_ERROR_QUERY_PARSE,
          "direction can only be INBOUND, OUTBOUND or ANY");
  }
}

ShortestPathNode::ShortestPathNode(ExecutionPlan* plan, size_t id,
                                   TRI_vocbase_t* vocbase, uint64_t direction,
                                   AstNode const* start, AstNode const* target,
                                   AstNode const* graph,
                                   TraversalOptions const& options)
    : ExecutionNode(plan, id),
      _vocbase(vocbase),
      _vertexOutVariable(nullptr),
      _edgeOutVariable(nullptr),
      _inStartVariable(nullptr),
      _inTargetVariable(nullptr),
      _graphObj(nullptr),
      _options(options) {
  TRI_ASSERT(_vocbase != nullptr);
  TRI_ASSERT(start != nullptr);
  TRI_ASSERT(target != nullptr);
  TRI_ASSERT(graph != nullptr);

  TRI_edge_direction_e baseDirection = parseDirection(direction);

  if (graph->type == NODE_TYPE_COLLECTION_LIST) {
    size_t edgeCollectionCount = graph->numMembers();
    auto resolver = std::make_unique<CollectionNameResolver>(vocbase);
    _graphJson = arangodb::basics::Json(arangodb::basics::Json::Array,
                                        edgeCollectionCount);
    _edgeColls.reserve(edgeCollectionCount);
    _directions.reserve(edgeCollectionCount);
    // List of edge collection names
    for (size_t i = 0; i < edgeCollectionCount; ++i) {
      auto col = graph->getMember(i);
      if (col->type == NODE_TYPE_DIRECTION) {
        // We have a collection with special direction.
        TRI_ASSERT(col->getMember(0)->isIntValue());
        TRI_edge_direction_e dir = parseDirection(col->getMember(0)->getIntValue());
        _directions.emplace_back(dir);
        col = col->getMember(1);
      } else {
        _directions.emplace_back(baseDirection);
      }

      std::string eColName = col->getString();
      auto eColType = resolver->getCollectionTypeCluster(eColName);
      if (eColType != TRI_COL_TYPE_EDGE) {
        std::string msg("collection type invalid for collection '" +
                        std::string(eColName) +
                        ": expecting collection type 'edge'");
        THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_ARANGO_COLLECTION_TYPE_INVALID,
                                       msg);
      }
      _graphJson.add(arangodb::basics::Json(eColName));
      _edgeColls.push_back(eColName);
    }
  } else {
    if (_edgeColls.empty()) {
      if (graph->isStringValue()) {
        std::string graphName = graph->getString();
        _graphJson = arangodb::basics::Json(graphName);
        _graphObj = plan->getAst()->query()->lookupGraphByName(graphName);

        if (_graphObj == nullptr) {
          THROW_ARANGO_EXCEPTION(TRI_ERROR_GRAPH_NOT_FOUND);
        }

        auto eColls = _graphObj->edgeCollections();
        size_t length = eColls.size();
        if (length == 0) {
          THROW_ARANGO_EXCEPTION(TRI_ERROR_GRAPH_EMPTY);
        }
        _edgeColls.reserve(length);
        _directions.reserve(length);

        for (const auto& n : eColls) {
          _edgeColls.push_back(n);
          _directions.emplace_back(baseDirection);
        }
      }
    }
  }

  parseNodeInput(start, _startVertexId, _inStartVariable);
  parseNodeInput(target, _targetVertexId, _inTargetVariable);
}

#warning IMPLEMENT
ShortestPathNode::ShortestPathNode(ExecutionPlan* plan,
                                   arangodb::basics::Json const& base)
    : ExecutionNode(plan, base) {
  THROW_ARANGO_EXCEPTION(TRI_ERROR_ARANGO_ILLEGAL_NAME);
}

#warning IMPLEMENT
void ShortestPathNode::toVelocyPackHelper(VPackBuilder&, bool) const {
  THROW_ARANGO_EXCEPTION(TRI_ERROR_OUT_OF_MEMORY);
  return;
}

#warning IMPLEMENT
ExecutionNode* ShortestPathNode::clone(ExecutionPlan*, bool, bool) const {
  THROW_ARANGO_EXCEPTION(TRI_ERROR_ARANGO_COLLECTION_DIRECTORY_ALREADY_EXISTS);
  return nullptr;
}

#warning IMPLEMENT
double ShortestPathNode::estimateCost(size_t&) const {
  THROW_ARANGO_EXCEPTION(TRI_ERROR_ARANGO_ATTRIBUTE_PARSER_FAILED);
  return 0;
}
