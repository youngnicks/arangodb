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
var state = "state";
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
  options = options || {};
  var httpOptions = {};
  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
    var body = JSON.stringify({
      step: stepNo,
      executionNumber: executionNumber,
      setup: options,
      conductor: ArangoServerState.id()
    });
    dbServers.forEach(
      function(dbServer) {
        ArangoClusterComm.asyncRequest("POST","server:" + dbServer, db._name(),
          "/_api/pregel", body,{}, httpOptions);
      }
    );
  } else {
    dbServers = ["localhost"];
    require("org/arangodb/pregel").Worker.executeStep(executionNumber, stepNo, options);
  }
};

var cleanUp = function (executionNumber) {
  var dbServers;
  var httpOptions = {};
  updateExecutionInfo(
    executionNumber, {state : stateFinished}
  );
  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
    dbServers.forEach(
      function(dbServer) {
        ArangoClusterComm.asyncRequest("POST","server:" + dbServer, db._name(),
          "/_api/pregel/cleanup/" + executionNumber, {},{},httpOptions);
      }
    );
  } else {
    dbServers = ["localhost"];
    httpOptions.type = "POST";
    // internal.download("/_db/" + db._name() + "/_api/pregel", body, httpOptions);
  }
};

var generateResultCollectionName = function (collectionName, executionNumber) {
  return "P_" + executionNumber + "_RESULT_" + collectionName;
};

////////////////////////////////////////////////////////////////////////////////
/// @brief initializes the next iteration of the Pregel- algorithm
///
////////////////////////////////////////////////////////////////////////////////
var initNextStep = function (executionNumber) {
  var info = getExecutionInfo(executionNumber);
  info[step]++;
  info[stepContent].push({
    active: 0,
    messages: 0
  });
  if (ArangoServerState.isCoordinator()) {
    info[waitForAnswer] = ArangoClusterInfo.getDBServers();
  } else {
    info[waitForAnswer] = ["localhost"];
  }
  updateExecutionInfo(executionNumber, info);
  var stepInfo = info[stepContent][info[step]];
  if( stepInfo[active] > 0 || stepInfo[messages] > 0) {
    startNextStep(executionNumber);
  } else {
    cleanUp(executionNumber);
  }
};


var createResultGraph = function (graph, executionNumber, noCreation) {
  var properties = graph._getCollectionsProperties();
  var map = {};
  Object.keys(properties).forEach(function (collection) {
    if (ArangoServerState.isCoordinator()) {
      map[collection] = {};
      map[collection].type = properties[collection].type;
      map[collection].resultCollection = generateResultCollectionName(collection, executionNumber);
      map[collection].originalShards =
      ArangoClusterInfo.getCollectionInfo(db._name(), collection).shards;
    } else {
      map[collection] = {};
      map[collection].type = properties[collection].type;
      map[collection].resultCollection = generateResultCollectionName(collection, executionNumber);
      map[collection].originalShards ={collection : "localhost"};
    }
    var props = {
      numberOfShards : properties[collection].numberOfShards,
      shardKeys : properties[collection].shardKeys
    };
    if (!noCreation) {
      db._create(generateResultCollectionName(collection, executionNumber) , props).ensureHashIndex("active");
    }
    if (ArangoServerState.isCoordinator()) {
      map[collection].resultShards =
        ArangoClusterInfo.getCollectionInfo(
          db._name(), generateResultCollectionName(collection, executionNumber)
        ).shards;
    } else {
      var c = {};
      c[generateResultCollectionName(collection, executionNumber)] = "localhost";
      map[collection].resultShards = c;
    }
  });
  if (noCreation) {
    return map;
  }
  var resultEdgeDefinitions = [], resultEdgeDefinition;
  var edgeDefinitions = graph.__edgeDefinitions;
  edgeDefinitions.forEach(
    function(edgeDefinition) {
      resultEdgeDefinition = {
        from : [],
        to : [],
        collection : generateResultCollectionName(edgeDefinition.collection, executionNumber)
      };
      edgeDefinition.from.forEach(
        function(col) {
          resultEdgeDefinition.from.push(generateResultCollectionName(col, executionNumber));
        }
      );
      edgeDefinition.to.forEach(
        function(col) {
          resultEdgeDefinition.to.push(generateResultCollectionName(col, executionNumber));
        }
      );
      resultEdgeDefinitions.push(resultEdgeDefinition);
    }
  );
  var orphanCollections = [];
  graph.__orphanCollections.forEach(function (o) {
    orphanCollections.push(generateResultCollectionName(o, executionNumber));
  });
  graphModule._create(generateResultCollectionName(graph.__name, executionNumber),
    resultEdgeDefinitions, orphanCollections);

  updateExecutionInfo(
    executionNumber, {graphName : generateResultCollectionName(graph.__name, executionNumber)}
  );
  return map;
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
  infoObject[state] = stateRunning;
  stepContentObject[active] = graph._countVertices();
  stepContentObject[messages] = 0;
  infoObject[stepContent] = [stepContentObject, {active: 0 , messages: 0}];

  var key = saveExecutionInfo(infoObject)._key;
  try {
    /*jslint evil : true */
    var x = new Function("(" + algorithm + "())");
    /*jslint evil : false */
  } catch (e) {
    var err = new ArangoError();
    err.errorNum = arangodb.errors.ERROR_BAD_PARAMETER.code;
    err.errorMessage = arangodb.errors.ERROR_BAD_PARAMETER.message;
    throw err;
  }

  setup = options  || {};
  setup.algorithm = algorithm;


  setup.map = createResultGraph(graph, key);

  startNextStep(key, setup);
  return key;
};

var getResult = function (executionNumber) {
  var info = getExecutionInfo(executionNumber);
  return info.graphName;
};


var getInfo = function(executionNumber) {
  var info = getExecutionInfo(executionNumber);
  var result = {};
  result.step = info[step];
  result.state = info[state];
  result.globals = {};

  return result;
};

var finishedStep = function(executionNumber, serverName, info) {
  var err;
  var runInfo = getExecutionInfo(executionNumber);
  if (info.step === undefined || info.step !== runInfo[step]) {
    err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.message;
    throw err;
  }
  var stepInfo = runInfo[stepContent][runInfo[step] + 1];
  if (info.messages === undefined || info.active === undefined) {
    err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.message;
    throw err;
  }
  stepInfo.messages += info.messages;
  stepInfo.active += info.active;
  var awaiting = runInfo[waitForAnswer];
  var index = awaiting.indexOf(serverName);
  if (index === -1) {
    err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.message;
    throw err;
  }
  awaiting.splice(index, 1);
  updateExecutionInfo(executionNumber, runInfo);
  if (awaiting.length === 0) {
    initNextStep(executionNumber);
  }
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
