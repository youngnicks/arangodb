/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments, ArangoClusterComm, ArangoServerState, ArangoClusterInfo */

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel worker functionality
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

var internal = require("internal");
var db = internal.db;
var graphModule = require("org/arangodb/general-graph");
var arangodb = require("org/arangodb");
var pregel = require("org/arangodb/pregel");
var taskManager = require("org/arangodb/tasks");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var tasks = require("org/arangodb/tasks");

var step = "step";
var stepContent = "stepContent";
var waitForAnswer = "waitForAnswer";
var active = "active";
var state = "state";
var error = "error";
var stateFinished = "finished";
var stateRunning = "running";
var stateError = "error";
var COUNTER = "counter";

var registerFunction = function(executionNumber, algorithm) {

  var taskToExecute = "function (params) {"
    + "var executionNumber = params.executionNumber;"
    + "var step = params.step;"
    + "var vertexid = params.vertexid;"
    + "var pregel = require('org/arangodb/pregel');"
    + "var worker = pregel.worker;"
    + "var vertex = pregel.Vertex(executionNumber, vertexid);"
    + "var messages = pregel.MessageQueue(executionNumber, vertexid, step);"
    + "var global = {"
    +   "step: step"
    + "};"
    + algorithm + "(vertex, messages, global);"
    + "worker.vertexDone(executionNumber, vertex, global);"
    + "}";

    // This has to be replaced by worker registry
    var col = pregel.getGlobalCollection(executionNumber);
    col.save({_key: "task", task: taskToExecute});

};

var addTask = function (executionNumber, vertexid, options) {

};

var setup = function(executionNumber, options) {
  // create global collection
  db._create(pregel.genWorkCollectionName(executionNumber));
  db._create(pregel.genMsgCollectionName(executionNumber)).ensureHashIndex("toShard");
  var global = db._create(pregel.genGlobalCollectionName(executionNumber));
  global.save({_key: COUNTER, count: -1});

  var collectionMapping = {};
  Object.keys(options.map).forEach(function (collection) {
    collectionMapping[collection] = options.map[collection].resultCollection;
  });

  Object.keys(options.map).forEach(function (collection) {
    var shards = Object.keys(options.map[collection].originalShards);
    var resultShards = Object.keys(options.map[collection].resultShards);
    for (var i = 0; i < shards.length; i++) {
      if (options.map[collection].originalShards[shards[i]] === ArangoServerState.id()) {
        var bindVars = {
          '@original' : shards[i],
          '@result' : resultShards[i]
        };
        if (options.map[collection].type === 3) {
          bindVars.collectionMapping = collectionMapping;
          db._query("FOR v IN @@original INSERT {" +
            "'_key' : v._key, 'activated' : true, 'deleted' : false, 'result' : {}, " +
            "'_from' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._from).collection, @collectionMapping), '/', PARSE_IDENTIFIER(v._from).key), " +
            "'_to' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._to).collection, @collectionMapping), '/', PARSE_IDENTIFIER(v._to).key)" +
            "} INTO  @@result", bindVars);
        } else {
          db._query("FOR v IN @@original INSERT {" +
            "'_key' : v._key, 'activated' : true, 'deleted' : false, 'result' : {} " +
            "} INTO  @@result", bindVars);
        }
      }
    }
  });


  // save mapping

  registerFunction(executionNumber, options.algorithm);
};


var activateVertices = function() {

};

///////////////////////////////////////////////////////////
/// @brief Creates a cursor containing all active vertices
///////////////////////////////////////////////////////////
var getActiveVerticesQuery = function (executionNumber) {
  return {
    hasNext : function () {
      return false;
    }
  };
};

var executeStep = function(executionNumber, step, options) {

  if (step === 0) {
    setup(executionNumber, options);
  }

  activateVertices();
  var q = getActiveVerticesQuery();
  // read full count from result and write to work
  var col = pregel.getGlobalCollection(executionNumber);
  col.update(COUNTER, {count: q.count()});
  while (q.hasNext()) {
    addTask(executionNumber, step, q.next(), options);
  }
};

var vertexDone = function (executionNumber, vertex, global) {
  vertex._save();
  var globalCol = pregel.getGlobalCollection(executionNumber);
  var counter = globalCol.document(COUNTER).count;
  counter--;
  globalCol.update(COUNTER, {count: counter});

  
};


// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.executeStep = executeStep;
exports.vertexDone = vertexDone;
