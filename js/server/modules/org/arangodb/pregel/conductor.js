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
var pregel = require("org/arangodb/pregel");
var arangodb = require("org/arangodb");
var tasks = require("org/arangodb/tasks");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var step = "step";
var timeout = "timeout";
var stepContent = "stepContent";
var waitForAnswer = "waitForAnswer";
var active = "active";
var state = "state";
var messages = "messages";
var error = "error";
var stateFinished = "finished";
var stateRunning = "running";
var stateError = "error";
var _pregel = db._pregel;

var genTaskId = function (executionNumber) {
  return "Pregel_Task_" + executionNumber;
};

var getExecutionInfo = function(executionNumber) {
  return _pregel.document(executionNumber);
};

var updateExecutionInfo = function(executionNumber, infoObject) {
  return _pregel.update(executionNumber, infoObject);
};

var saveExecutionInfo = function(infoObject, globals) {
  infoObject.globalValues = globals;
  return _pregel.save(infoObject);
};

var getGlobals = function(executionNumber) {
  return _pregel.document(executionNumber).globalValues;
};

var getWaitForAnswerMap = function() {
  var waitForAnswerMap = {}, serverList;
  if (ArangoServerState.isCoordinator()) {
    serverList = ArangoClusterInfo.getDBServers();
  } else {
    serverList = ["localhost"];
  }
  serverList.forEach(function(s) {
    waitForAnswerMap[s] = false;
  });
  return waitForAnswerMap;
};

var startNextStep = function(executionNumber, options) {
  var dbServers;
  var info = getExecutionInfo(executionNumber);
  var globals = getGlobals(executionNumber);
  var stepNo = info[step];
  options = options || {};
  if (info[timeout]) {
    options[timeout] = info[timeout];
  }
  options.conductor = pregel.getServerName();
  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
    var body = {
      step: stepNo,
      executionNumber: executionNumber,
      setup: options
    };
    if (globals) {
      body.globals = globals;
    }
    body = JSON.stringify(body);
    var httpOptions = {};
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    dbServers.forEach(
      function(dbServer) {
        ArangoClusterComm.asyncRequest("POST","server:" + dbServer, db._name(),
          "/_api/pregel/nextStep", body, httpOptions, coordOptions);
      }
    );
    var i;
    var debug;
    for (i = 0; i < dbServers.length; i++) {
      debug = ArangoClusterComm.wait(coordOptions);
      require("console").log(JSON.stringify(debug));
    }
    tasks.register({
      id: genTaskId(executionNumber),
      offset: options.timeout || pregel.getTimeoutConst(executionNumber),
      command: function(params) {
        var c = require("org/arangodb/pregel").Conductor;
        c.timeOutExecution(params.executionNumber);
      },
      params: {executionNumber: executionNumber}
    });
  } else {
    dbServers = ["localhost"];
    if (globals) {
      pregel.Worker.executeStep(executionNumber, stepNo, options, globals);
    } else {
      pregel.Worker.executeStep(executionNumber, stepNo, options);
    }
  }
};

var cleanUp = function (executionNumber, err) {
  var dbServers;
  var httpOptions = {};
  var execInfo = {state : stateFinished};
  if (err) {
    execInfo.state = stateError;
    execInfo.error = err;
  }

  updateExecutionInfo(
    executionNumber, execInfo
  );
  if (ArangoServerState.isCoordinator()) {
    dbServers = ArangoClusterInfo.getDBServers();
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    dbServers.forEach(
      function(dbServer) {
        ArangoClusterComm.asyncRequest("POST","server:" + dbServer, db._name(),
          "/_api/pregel/cleanup/" + executionNumber, {}, httpOptions, coordOptions);
      }
    );
    var i;
    var debug;
    for (i = 0; i < dbServers.length; i++) {
      debug = ArangoClusterComm.wait(coordOptions);
      require("console").log(JSON.stringify(debug));
    }
  } else {
    dbServers = ["localhost"];
    httpOptions.type = "POST";
    require("org/arangodb/pregel").Worker.cleanUp(executionNumber);
  }
};

var timeOutExecution = function (executionNumber) {
  var err = new ArangoError({
    errorNum: ERRORS.ERROR_PREGEL_TIMEOUT.code,
    errorMessage: ERRORS.ERROR_PREGEL_TIMEOUT.message
  });
  cleanUp(executionNumber, err);
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
  info[waitForAnswer] = getWaitForAnswerMap();
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
    map[collection] = {};
    map[collection].type = properties[collection].type;
    map[collection].resultCollection = generateResultCollectionName(collection, executionNumber);
    if (ArangoServerState.isCoordinator()) {
      map[collection].originalShards =
        ArangoClusterInfo.getCollectionInfo(db._name(), collection).shards;
      map[collection].shardKeys = properties[collection].shardKeys;
    } else {
      map[collection].originalShards = {};
      map[collection].originalShards[collection]= "localhost";
      map[collection].shardKeys = [];
    }
    var props = {
      numberOfShards : properties[collection].numberOfShards,
      shardKeys : properties[collection].shardKeys,
      distributeShardsLike : collection
    };
    if (!noCreation) {
      if (map[collection].type === 2) {
        db._create(generateResultCollectionName(collection, executionNumber) , props).ensureHashIndex("active");
      } else {
        db._createEdgeCollection(
          generateResultCollectionName(collection, executionNumber) , props
        );
      }
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
  var graph = graphModule._graph(graphName), infoObject = {},
    stepContentObject = {};
  infoObject[waitForAnswer] = getWaitForAnswerMap();
  infoObject[step] = 0;
  options = options  || {};
  if (options[timeout]) {
    infoObject[timeout] = options[timeout];
    delete options.timeout;
  }
  infoObject[state] = stateRunning;
  stepContentObject[active] = graph._countVertices();
  stepContentObject[messages] = 0;
  infoObject[stepContent] = [stepContentObject, {active: 0 , messages: 0}];
  var key = saveExecutionInfo(infoObject, options)._key;
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

  options.algorithm = algorithm;

  options.map = createResultGraph(graph, key);

  startNextStep(key, options);
  return key;
};

var getResult = function (executionNumber) {
  var info = getExecutionInfo(executionNumber), result = {};
  if (info.state === stateFinished) {
    result.error = false;
    result.result = {graphName : info.graphName, state : info.state};
  } else if (info.state === stateRunning) {
    result.error = false;
    result.result = {graphName : "", state : info.state};
  } else {
    result = info.error;
    result.state = info.state;
  }
  return result;
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
  if (info.messages === undefined || info.active === undefined) {
    err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.message;
    throw err;
  }
  var awaiting = runInfo[waitForAnswer];
  if (awaiting[serverName] === undefined) {
    err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.message;
    throw err;
  }
  var checks = db._executeTransaction({
    collections: {
      write: [
        "_pregel"
      ]
    },
    action: function (params) {
      var info = params.info;
      var getExecutionInfo = params.getExecutionInfo;
      var updateExecutionInfo = params.updateExecutionInfo;
      var executionNumber = params.executionNumber;
      var runInfo = getExecutionInfo(executionNumber);
      var stepInfo = runInfo[stepContent][runInfo[step] + 1];
      stepInfo.messages += info.messages;
      stepInfo.active += info.active;
      runInfo.error = info.error;
      var serverName = params.serverName;
      var awaiting = runInfo[waitForAnswer];
      awaiting[serverName] = true;
      updateExecutionInfo(executionNumber, runInfo);
      var everyServerResponded = true;
      Object.keys(awaiting).forEach(function(s) {
        if (awaiting[s] === false) {
          everyServerResponded = false;
        }
      });
      return {
        respond: everyServerResponded,
        error: runInfo.error
      };
    },
    params: {
      serverName: serverName,
      updateExecutionInfo: updateExecutionInfo,
      getExecutionInfo: getExecutionInfo,
      executionNumber: executionNumber,
      info: info
    }
  });
  if (checks.respond && !checks.error) {
    if (ArangoServerState.isCoordinator()) {
      tasks.unregister(genTaskId(executionNumber));
    }
    initNextStep(executionNumber);
  } else if (checks.respond) {
    if (ArangoServerState.isCoordinator()) {
      tasks.unregister(genTaskId(executionNumber));
    }
    cleanUp(executionNumber, checks.error);
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
exports.timeOutExecution = timeOutExecution;
