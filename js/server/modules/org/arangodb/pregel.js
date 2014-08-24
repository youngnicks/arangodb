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
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var Mapping = function(executionNumber) {
  this._map = exports.getGlobalCollection(executionNumber).document("map");
};

Mapping.prototype.getResultCollection = function (id) {
  return id.split('/')[0];
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
    locParams[keys[i]] = params[prefix + i];
  }
  p.storeWatch("transformToFindShard", t);
  return locParams;
};

Mapping.prototype.getShardKeys = function (col) {
  return this._map.shardKeys[col]; 
};

Mapping.prototype.getGlobalCollectionShards = function () {
  return this._map.shardMap; 
};

Mapping.prototype.getLocalCollectionShards = function (col) {
  return this._map.serverShardMap[exports.getServerName()][col]; 
};

Mapping.prototype.getLocalResultShards = function (col) {
  return this._map.serverResultShardMap[exports.getServerName()][col]; 
};

Mapping.prototype.getLocalResultShardMapping = function () {
  return this._map.serverResultShardMap[exports.getServerName()]; 
};

Mapping.prototype.getResponsibleShardFromMapping = function (executionNumber, resShard) {
  throw "Not yet";
  var t = p.stopWatch();
  var map = exports.getMap(executionNumber);
  var correct = _.filter(map, function (e) {
    return e.resultShards[resShard] !== undefined;
  })[0];
  var resultList = Object.keys(correct.resultShards);
  var index = resultList.indexOf(resShard);
  var originalList = Object.keys(correct.originalShards);
  p.storeWatch("RespMapShard", t);
  return originalList[index];
};


Mapping.prototype.getResponsibleShard = function (col, edge) {
  var t = p.stopWatch();
  if (ArangoServerState.role() === "PRIMARY") {
    var doc = this.transformToFindShard(col, edge, "shard_");
    var colId = ArangoClusterInfo.getCollectionInfo(db._name(), col).id;
    var res = ArangoClusterInfo.getResponsibleShard(colId, doc).shardId;
    p.storeWatch("GetRespShard", t);
    return res;
  }
  p.storeWatch("GetRespShard", t);
  return col;
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
  obj._id = edge._to;
  var toCol = edge._to.split("/")[0];
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



// End of Mapping Object

exports.getServerName = function () {
  return ArangoServerState.id() || "localhost";
};

exports.genWorkCollectionName = function (executionNumber) {
  return "P_work_" + executionNumber;
};

exports.genMsgCollectionName = function (executionNumber) {
  return "P_messages_" + executionNumber;
};

exports.genGlobalCollectionName = function (executionNumber) {
  return "P_global_" + executionNumber;
};

exports.createWorkerCollections = function (executionNumber) {
  var t = p.stopWatch();
  var work = db._create(
    exports.genWorkCollectionName(executionNumber)
  );
  work.ensureSkiplist("toShard");
  work.ensureSkiplist("step");
  var message = db._create(
    exports.genMsgCollectionName(executionNumber)
  );
  message.ensureSkiplist("toShard");
  db._create(exports.genGlobalCollectionName(executionNumber));
  p.storeWatch("setupWorkerCollections", t);
};

exports.getWorkCollection = function (executionNumber) {
  return db._collection(exports.genWorkCollectionName(executionNumber));
};

exports.getTimeoutConst = function (executionNumber) {
  return 300000;
};

exports.getMsgCollection = function (executionNumber) {
  return db._collection(exports.genMsgCollectionName(executionNumber));
};

exports.getGlobalCollection = function (executionNumber) {
  return db._collection(exports.genGlobalCollectionName(executionNumber));
};

exports.getMap = function (executionNumber) {
  return exports.getGlobalCollection(executionNumber).document("map").map;
};

exports.getAggregator = function (executionNumber) {
  var t = p.stopWatch();
  var col = exports.getGlobalCollection(executionNumber);
  if (col.exists("aggregator")) {
    p.storeWatch("loadAggregator", t);
    return col.document("aggregator").func;
  }
  p.storeWatch("loadAggregator", t);
};

exports.saveAggregator = function (executionNumber, func) {
  exports.getGlobalCollection(executionNumber).save({
    _key: "aggregator",
    func: func
  });
};

var saveMapping = function (executionNumber, name, map) {
  var col = exports.getGlobalCollection(executionNumber);
  map._key = name;
  col.save(map);
};

exports.saveEdgeShardMapping = function (executionNumber, map) {
  saveMapping(executionNumber, "edgeShards", map);
};

exports.saveShardKeyMapping = function (executionNumber, map) {
  saveMapping(executionNumber, "shardKeys", map);
};

exports.saveShardMapping = function (executionNumber, list) {
  var col = exports.getGlobalCollection(executionNumber);
  col.save({
    _key: "shards",
    list: list
  });
};

exports.saveLocalShardMapping = function (executionNumber, map) {
  saveMapping(executionNumber, "localShards", map[exports.getServerName()]);
};

exports.saveLocalResultShardMapping = function (executionNumber, map) {
  saveMapping(executionNumber, "localResultShards", map[exports.getServerName()]);
};

var loadMapping = function (executionNumber, name) {
  var t = p.stopWatch();
  var res = exports.getGlobalCollection(executionNumber).document(name);
  p.storeWatch("loadMapping", t);
  return res;
};

exports.storeAggregate = function(executionNumber) {
  var msg = exports.genMsgCollectionName(executionNumber);
  var agg = exports.getAggregator(executionNumber);
  if (agg) {
    var f = new Function("newMessage", "oldMessage", "return (" +  agg + ")(newMessage,oldMessage);");
    return function(step, target, info) {
      var t = p.stopWatch();
      db._executeTransaction({
        collections: {
          write: [msg]
        },
        action: function(params) {
          var db = require("internal").db;
          var col = db[params.col];
          var old = col.firstExample({
            step: params.step,
            _toVertex: target._id
          });
          if (old) {
            old.data = [params.func(params.info.data, old.data[0])];
            col.replace(old._key, old);
            return;
          }
          var toSend = {
            _toVertex: target._id,
            data: [params.info.data],
            step: params.step,
            toShard: target.shard
          };
          col.save(toSend);
        },
        params: {
          info: info,
          target: target,
          col: msg,
          step: step,
          func: f
        }
      });
      p.storeWatch("UserAggregate", t);
    };
  }
  return function(step, target, info) {
    var t = p.stopWatch();
    db._executeTransaction({
      collections: {
        write: [msg]
      },
      action: function(params) {
        var db = require("internal").db;
        var col = db[params.col];
        var old = col.firstExample({
          step: params.step,
          _toVertex: target._id
        });
        if (old) {
          old.data.push(params.info.data);
          if (old.sender) {
            old.sender.push(params.info.sender);
          }
          col.update(old._key, old);
          return;
        }
        var toSend = {
          _toVertex: target._id,
          data: [params.info.data],
          step: params.step,
          toShard: target.shard
        };
        if (info.sender) {
          toSend.sender = [params.info.sender];
        }
        col.save(toSend);
      },
      params: {
        info: info,
        target: target,
        col: msg,
        step: step
      }
    });
    p.storeWatch("DefaultAggregate", t);
  };
};

exports.Conductor = require("org/arangodb/pregel/conductor");
exports.Worker = require("org/arangodb/pregel/worker");
exports.Vertex = require("org/arangodb/pregel/vertex").Vertex;
exports.GraphAccess = require("org/arangodb/pregel/graphAccess").GraphAccess;
exports.Edge = require("org/arangodb/pregel/edge").Edge;
exports.MessageQueue = require("org/arangodb/pregel/messagequeue").MessageQueue;
exports.Mapping = Mapping;
