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

#ifndef ARANGOD_AQL_SHORTEST_PATH_BLOCK_H
#define ARANGOD_AQL_SHORTEST_PATH_BLOCK_H 1

#include "Aql/ExecutionBlock.h"
#include "Aql/ShortestPathNode.h"
#include "V8Server/V8Traverser.h"

namespace arangodb {
namespace aql {

class ShortestPathNode;

class ShortestPathBlock : public ExecutionBlock {

 public:
  ShortestPathBlock(ExecutionEngine* engine, ShortestPathNode const* ep);

  ~ShortestPathBlock();

  /// @brief initialize, here we fetch all docs from the database
  int initialize() override;

  /// @brief initializeCursor
  int initializeCursor(AqlItemBlock* items, size_t pos) override;

  /// @brief getSome
  AqlItemBlock* getSome(size_t atLeast, size_t atMost) override final;

  // skip between atLeast and atMost, returns the number actually skipped . . .
  // will only return less than atLeast if there aren't atLeast many
  // things to skip overall.
  size_t skipSome(size_t atLeast, size_t atMost) override final;

 private:

  /// SECTION private Functions

  /// @brief Compute the next shortest path
  void nextPath();

  /// @brief Checks if we output the vertex
  bool usesVertexOutput() { return _vertexVar != nullptr; }

  /// @brief Checks if we output the edge
  bool usesEdgeOutput() { return _edgeVar != nullptr; }

  /// SECTION private Variables

  /// @brief Variable for the vertex output
  Variable const* _vertexVar;

  /// @brief Register for the vertex output
  RegisterId _vertexReg;

  /// @brief Variable for the edge output
  Variable const* _edgeVar;

  /// @brief Register for the edge output
  RegisterId _edgeReg;

  /// @brief options to compute the shortest path
  traverser::ShortestPathOptions _opts;

  /// @brief list of edge collection infos used to compute the path
  std::vector<EdgeCollectionInfo*> _collectionInfos;

  /// @brief position in the current path
  size_t _posInPath;

  /// @brief length of the current path
  size_t _pathLength;

  /// @brief current computed path.
  std::unique_ptr<traverser::ShortestPath> _path;

};

} // namespace arangodb::aql
} // namespace arangodb
#endif
