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

var db = require("internal").db;
var _ = require("underscore");

exports.getServerName = function () {
  return ArangoServerState.id() || "localhost";
};
exports.genWorkCollectionName = function (executionNumber) {
  return "work_" + executionNumber;
};

exports.genMsgCollectionName = function (executionNumber) {
  return "messages_" + executionNumber;
};

exports.genGlobalCollectionName = function (executionNumber) {
  return "global_" + executionNumber;
};

exports.getWorkCollection = function (executionNumber) {
  return db._collection(exports.genWorkCollectionName(executionNumber));
};


exports.getMsgCollection = function (executionNumber) {
  return db._collection(exports.genMsgCollectionName(executionNumber));
};

exports.getOriginalCollection = function (id) {
  return id.split('/')[0];
};

exports.getResultCollection = function (id) {
  var origCollection = db[this.getOriginalCollection(id)].document(id);
};

exports.getGlobalCollection = function (executionNumber) {
  return db._collection(exports.genGlobalCollectionName(executionNumber));
};

exports.getResponsibleShard = function (doc) {
  var info = doc.split("/");
  var col = info[0];
  if (ArangoServerState.role() === "PRIMARY") {
    var key = info[1];
    return ArangoClusterInfo.getResponsibleShard(col, {_key: key});
  }
  return col;
};

exports.getResponsibleEdgeShards = function (executionNumber, doc) {
  var globalCol = exports.getGlobalCollection(executionNumber);
  var col = doc.split("/");
  var map = globalCol.document("map").map;
  var example = {
    _from: doc
  };
  var result = [];
  if(map[col] !== undefined) {
    if (ArangoServerState.role() === "PRIMARY") {
      _.each(map, function (c, key) {
        if (c.type === 3) {
          result.push(ArangoClusterInfo.getResponsibleShard(key, example));
        }
      });
      return result;
    }
    _.each(map, function (c, key) {
      if (c.type === 3) {
        result.push(key);
      }
    });
    return result;
  }
  if (ArangoServerState.role() === "PRIMARY") {
    _.each(map, function (c) {
      if (c.type === 3) {
        result.push(ArangoClusterInfo.getResponsibleShard(c.resultCollection, example));
      }
    });
    return result;
  }
  _.each(map, function (c) {
    if (c.type === 3) {
      result.push(c.resultCollection);
    }
  });
  return result;
};

exports.Conductor = require("org/arangodb/pregel/conductor");
exports.Worker = require("org/arangodb/pregel/worker");
exports.Vertex = require("org/arangodb/pregel/vertex").Vertex;
exports.MessageQueue = require("org/arangodb/pregel/messagequeue").MessageQueue;
