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
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var tasks = require("org/arangodb/tasks");

var step = "step";
var stepContent = "stepContent";
var waitForAnswer = "waitForAnswer";
var active = "active";
var state = "state";
var messages = "messages";
var work = "work";
var error = "error";
var stateFinished = "finished";
var stateRunning = "running";
var stateError = "error";

var genWorkCollectionName = function (executionNumber) {
  return work + "_" + executionNumber;
};

var genMsgCollectionName = function (executionNumber) {
  return messages + "_" + executionNumber;
};

var getWorkCollection = function (executionNumber) {
  return db._collection(genWorkCollectionName(executionNumber));
};

var registerFunction = function(executionNumber, algorithm) {

  var taskToExecute = "function (params) {"
    + "var executionNumber = params.executionNumber;"
    + "var step = params.step;"
    + "var vertexid = params.vertexid;"
    + "var pregel = require('org/arangodb/pregel');"
    + "var worker = pregel.worker;"
    + "var vertex = pregel.Vertex(executionNumber, vertexid);"
    + "var messages = pregel.MessageQueue(executionNumber, vertexid);"
    + "var global = {"
    +   "step: step"
    + "};"
    + algorithm + "(vertex, messages, global);"
    + "worker.vertexDone(executionNumber, step, vertexid);"
    + "}";

    // This has to be replaced by worker registry
    var col = getWorkCollection(executionNumber);
    col.save({_key: "task", task: taskToExecute});

};

var addTask = function (executionNumber, vertexid, options) {

};

var setup = function(executionNumber, options) {

  db._create(genWorkCollectionName(executionNumber));
  db._create(genMsgCollectionName(executionNumber)).ensureHashIndex("toServer");

  //save original vertices and edges to result collections

  registerFunction(executionNumber, options.algorithm);
};


var activateVertices = function() {

};

///////////////////////////////////////////////////////////
/// @brief Creates a cursor containing all active vertices
///////////////////////////////////////////////////////////
var getActiveVerticesQuery = function (executionNumber) {
  return undefined;
};

var executeStep = function(executionNumber, step, options) {

  if (step === 0) {
    setup(executionNumber, options);
  }

  activateVertices();
  var q = getActiveVerticesQuery();
  while (q.hasNext()) {
    addTask(executionNumber, step, q.next(), options);
  }
};

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.executeStep = executeStep;
