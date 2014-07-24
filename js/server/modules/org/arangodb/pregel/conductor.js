/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments, ArangoClusterComm, ArangoServerState, ArangoClusterInfo */

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

var internal = require("internal");
var db = internal.db;
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

var saveExecutionInfo = function(infoObject) {
  var pregel = db._pregel;
  return pregel.save(infoObject);
};

var startNextStep = function(executionNumber, options) {
  var dbServers;
  var info = getExecutionInfo(executionNumber);
  var stepNo = info[step];
  var httpOptions = {};
  var body = JSON.stringify({step: stepNo, executionNumber: executionNumber, setup: options});

  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
    dbServers.forEach(
      function(dbServer) {
        var op = ArangoClusterComm.asyncRequest("POST","server:" + dbServer, db._name(),
          "/_api/pregel", body,{},options);
      }
    );
  } else {
    dbServers = ["localhost"];
    httpOptions.type = "POST";
    // internal.download("/_db/" + db._name() + "/_api/pregel", body, httpOptions);
  }
};

var cleanUp = function(executionNumber) {
  return undefined;
};

var generateResultCollectionName = function (collectionName, executionNumber) {
  return "P_" + executionNumber + "_RESULT_" + collectionName;
}

////////////////////////////////////////////////////////////////////////////////
/// @brief initializes the next iteration of the Pregel- algorithm
///
////////////////////////////////////////////////////////////////////////////////
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
  var graph = graphModule._graph(graphName), dbServers, infoObject = {},
    stepContentObject = {} , setup;
  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
  } else {
    dbServers = ["localhost"];
  }
  infoObject[waitForAnswer] = dbServers;
  infoObject[step] = 0;
  stepContentObject[active] = graph._countVertices();
  stepContentObject[messages] = 0;
  infoObject[stepContent] = [stepContentObject];

  var key = saveExecutionInfo(infoObject)._key;
  try {
    new Function("(" + algorithm + "())");
  } catch (err) {
    var err = new ArangoError();
    err.errorNum = arangodb.errors.ERROR_BAD_PARAMETER.code;
    err.errorMessage = arangodb.errors.ERROR_BAD_PARAMETER.message;
    throw err;
  }

  setup = options  || {};
  setup.algorithm = algorithm;

  var properties = graph._getVertexCollectionsProperties();
  Object.keys(properties).forEach(function (collection) {
      var props = {
        numberOfShards : properties[collection].numberOfShards,
        shardKeys : properties[collection].shardKeys
      };
      db._create(generateResultCollectionName(collection, key) , props);
  });

  startNextStep(key, setup);
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
