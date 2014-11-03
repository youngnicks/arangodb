/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, ArangoClusterInfo, ArangoServerState, ArangoAgency*/

////////////////////////////////////////////////////////////////////////////////
/// @brief Pregel module. Offers all submodules of pregel.
///
/// @file
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
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Florian Bartels, Michael Hackstein, Guido Schwab
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var _ = require("underscore");
var arangodb = require("org/arangodb");
var SERVERNAME;

exports.isClusterSetup = function () {
  'use strict';
  return ArangoAgency.prefix() !== "";
};

exports.getServerName = function () {
  'use strict';
  if (SERVERNAME === undefined) {
    SERVERNAME = ArangoServerState.id() || "localhost";
  }
  return SERVERNAME; 
};

exports.getCollection = function () {
  'use strict';
  return db._pregel;
};

exports.getExecutionInfo = function(executionNumber) {
  'use strict';
  return _.clone(exports.getCollection().document(executionNumber));
};

exports.updateExecutionInfo = function(executionNumber, infoObject) {
  'use strict';
  return exports.getCollection().update(executionNumber, infoObject);
};

exports.removeExecutionInfo = function(executionNumber) {
  'use strict';
  return exports.getCollection().remove(executionNumber);
};

exports.genGlobalCollectionName = function (executionNumber) {
  'use strict';
  return "P_global_" + executionNumber;
};

exports.createWorkerCollections = function (executionNumber) {
  'use strict';
  db._create(exports.genGlobalCollectionName(executionNumber));
};

exports.getWorkCollection = function (executionNumber) {
  'use strict';
  return db[exports.genWorkCollectionName(executionNumber)];
};

exports.getTimeoutConst = function () {
  'use strict';
  return 300000;
};

exports.getGlobalCollection = function (executionNumber) {
  'use strict';
  return db._collection(exports.genGlobalCollectionName(executionNumber));
};

exports.getMap = function (executionNumber) {
  'use strict';
  return exports.getGlobalCollection(executionNumber).document("map").map;
};

var saveMapping = function (executionNumber, name, map) {
  'use strict';
  var col = exports.getGlobalCollection(executionNumber);
  map._key = name;
  col.save(map);
};

exports.saveEdgeShardMapping = function (executionNumber, map) {
  'use strict';
  saveMapping(executionNumber, "edgeShards", map);
};

exports.saveShardKeyMapping = function (executionNumber, map) {
  'use strict';
  saveMapping(executionNumber, "shardKeys", map);
};

exports.saveShardMapping = function (executionNumber, list) {
  'use strict';
  var col = exports.getGlobalCollection(executionNumber);
  col.save({
    _key: "shards",
    list: list
  });
};

exports.saveLocalShardMapping = function (executionNumber, map) {
  'use strict';
  saveMapping(executionNumber, "localShards", map[exports.getServerName()]);
};

exports.saveLocalResultShardMapping = function (executionNumber, map) {
  'use strict';
  saveMapping(executionNumber, "localResultShards", map[exports.getServerName()]);
};

exports.Conductor = require("org/arangodb/pregel/conductor");
exports.Worker = require("org/arangodb/pregel/worker");
exports.Vertex = require("org/arangodb/pregel/vertex").Vertex;
exports.VertexList = require("org/arangodb/pregel/vertex").VertexList;
exports.GraphAccess = require("org/arangodb/pregel/graphAccess").GraphAccess;
exports.Edge = require("org/arangodb/pregel/edge").Edge;
exports.EdgeIterator = require("org/arangodb/pregel/edge").EdgeIterator;
exports.MessageQueue = require("org/arangodb/pregel/messagequeue").MessageQueue;
exports.Mapping = require("org/arangodb/pregel/mapping").Mapping;
