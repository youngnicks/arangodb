/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, ArangoClusterInfo, ArangoServerState*/

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
var p = require("org/arangodb/profiler");

var db = require("internal").db;
var _ = require("underscore");
var pregel = require("org/arangodb/pregel");
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var Mapping = function(executionNumber) {
  this._map = pregel.getGlobalCollection(executionNumber).document("map");
};

Mapping.prototype.getResultCollection = function (id) {
  return this._map.collectionMap[id];
};

Mapping.prototype.transformToFindShard = function (col, params, prefix) {
  var t = p.stopWatch();
  if (!prefix) {
    prefix = "shard_";
  }
  var keys = this.getShardKeys(col);
  var locParams = {};
  var i;
  for (i = 0; i < keys.length; i++) {
    locParams[keys[i]] = params._doc[prefix + i];
  }
  p.storeWatch("transformToFindShard", t);
  return locParams;
};

Mapping.prototype.getShardKeys = function (col) {
  return this._map.shardKeyMap[col]; 
};

Mapping.prototype.getGlobalCollectionShards = function () {
  return this._map.shardMap; 
};

Mapping.prototype.getLocalCollectionShards = function (col) {
  return this._map.serverShardMap[pregel.getServerName()][col]; 
};

Mapping.prototype.getLocalCollectionShardMapping = function () {
  return this._map.serverShardMap[pregel.getServerName()]; 
};

Mapping.prototype.getLocalResultShards = function (col) {
  return this._map.serverResultShardMap[pregel.getServerName()][col]; 
};

Mapping.prototype.getLocalResultShardMapping = function () {
  return this._map.serverResultShardMap[pregel.getServerName()]; 
};

Mapping.prototype.getResultShard = function (shard) {
  return this._map.resultShards[shard];
};

Mapping.prototype.getShardKeysForCollection = function (collection) {
  var t = p.stopWatch();
  var keys = this.getShardKeys(collection);
  if (!keys) {
    var err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_INVALID_TARGET_VERTEX.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_INVALID_TARGET_VERTEX.message;
    throw err;
  }
  p.storeWatch("ColShardKeys", t);
  return keys;
};

Mapping.prototype.getResponsibleEdgeShards = function (shard) {
  var t = p.stopWatch();
  var res = this._map.edgeShards[shard];
  p.storeWatch("RespEdgeShards", t);
  return res;
};

Mapping.prototype.getToLocationObject = function (edge) {
  var t = p.stopWatch();
  var obj = {};
  obj._id = edge._doc._to;
  var toCol = edge._doc._to.split("/")[0];
  if (ArangoServerState.role() === "PRIMARY") {
    var locParams = this.transformToFindShard(toCol, edge, "to_shard_"); 
    locParams._id = obj._id; 
    var colId = ArangoClusterInfo.getCollectionInfo(db._name(), toCol).id;
    obj.shard = ArangoClusterInfo.getResponsibleShard(colId, locParams).shardId;
  } else {
    obj.shard = toCol;
  }
  p.storeWatch("getToLocObj", t);
  return obj;
};

exports.Mapping = Mapping;
