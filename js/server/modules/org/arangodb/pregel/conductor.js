/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments */

////////////////////////////////////////////////////////////////////////////////
/// @brief Graph functionality
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
var graphModule = require("org/arangodb/general-graph");
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var step = "step";
var stepContent = "stepContent";
var waitForAnswer = "waitForAnswer";
var active = "active";
var messages = "messages";
var error = "error";
var stateFinished = "finished";
var stateRunning = "running";
var stateError = "error";

var getExecutionInfo = function(executionNumber) {
  var pregel = db._pregel;
  return pregel.document(executionNumber);
};

var updateExecutionInfo = function(executionNumber, infoObject) {
  var pregel = db._pregel;
  return pregel.update(executionNumber, infoObject);
};

var startNextStep = function(executionNumber) {

  return undefined;
};

var cleanUp = function(executionNumber) {
  return undefined;
};

var initNextStep = function(executionNumber) {
  var info = getExecutionInfo();
  info[step] = info[step]++;
  updateExecutionInfo(executionNumber, info);
  if( info[active] > 0 || info[messages] > 0) {
    startNextStep(executionNumber);
  } else {
    cleanUp(executionNumber);
  }
};

var startExecution = function(graphName, algorithm, options) {

  var graph = graphModule._graph(graphName),
    countVertices = graph._countVertices();

  var Communication = require("org/arangodb/cluster/agency-communication"),
    comm = new Communication.Communication(),
    beats = comm.sync.Heartbeats(),
    diff = comm.diff.current,
    servers = comm.current.DBServers();

  // get dbserver
  // store request

  var executionNumber = "1";
  return executionNumber;
};

var getResult = function (executionNumber) {
  var resultingGraph = "graphName";
  return resultingGraph;
};


var getInfo = function(executionNumber) {
  var info = getExecutionInfo();
  var result = {};
  result.step = info[step];
  if (info[error]) {
    result.state = stateError;
  } else if( info[active] === 0 && info[messages] === 0) {
    result.state = stateFinished;
  } else {
    result.state = stateRunning;
  }
  result.globals = {}

  return result;
};

var finishedStep = function(executionNumber, serverName, info) {
  var err;
  var runInfo = getExecutionInfo(executionNumber);
  if (info.step === undefined || info.step !== runInfo[step]) {
    err = new ArangoError();
    err.errNum = ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.code;
    err.errMessage = ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.message;
    throw err;
  }
  var stepInfo = runInfo[stepContent][runInfo[step]];
  if (info.messages === undefined || info.active === undefined) {
    err = new ArangoError();
    err.errNum = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code;
    err.errMessage = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.message;
    throw err;
  }
  stepInfo.messages += info.messages;
  stepInfo.active += info.active;
  var awaiting = runInfo[waitForAnswer];
  var index = awaiting.indexOf(serverName);
  if (index === -1) {
    err = new ArangoError();
    err.errNum = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code;
    err.errMessage = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.message;
    throw err;
  }
  awaiting.splice(index, 1);
  updateExecutionInfo(executionNumber, runInfo);
};

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.startExecution = startExecution;
exports.getResult = getResult;
exports.getInfo = getInfo;

// Internal functions
exports.finishedStep = finishedStep;
