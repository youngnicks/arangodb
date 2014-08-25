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
var p = require("org/arangodb/profiler");

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
var _ = require("underscore");

function getCollection () {
  return db._pregel;
}

var genTaskId = function (executionNumber) {
  return "Pregel_Task_" + executionNumber;
};

var getExecutionInfo = function(executionNumber) {
  return _.clone(getCollection().document(executionNumber));
};

var updateExecutionInfo = function(executionNumber, infoObject) {
  return getCollection().update(executionNumber, infoObject);
};

var saveExecutionInfo = function(infoObject, globals) {
  infoObject.globalValues = globals;
  return getCollection().save(infoObject);
};

var getGlobals = function(executionNumber) {
  return getCollection().document(executionNumber).globalValues;
};

var saveGlobals = function(executionNumber, globals) {
  return getCollection().update(executionNumber, {globalValues : globals});
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
  var t = p.stopWatch();
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
    tasks.register({
      id: genTaskId(executionNumber),
      offset: options.timeout || pregel.getTimeoutConst(executionNumber),
      command: function(params) {
        var c = require("org/arangodb/pregel").Conductor;
        c.timeOutExecution(params.executionNumber);
      },
      params: {executionNumber: executionNumber}
    });
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
    }
  } else {
    dbServers = ["localhost"];
    p.storeWatch("TriggerNextStep", t);
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
  /*if (ArangoServerState.isCoordinator()) {
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
    }
  } else {
    dbServers = ["localhost"];
    httpOptions.type = "POST";
    require("org/arangodb/pregel").Worker.cleanUp(executionNumber);
  }*/
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
  var t = p.stopWatch();
  var info = getExecutionInfo(executionNumber);
  info[step]++;
  info[stepContent].push({
    active: 0,
    messages: 0
  });
  info[waitForAnswer] = getWaitForAnswerMap();
  updateExecutionInfo(executionNumber, info);

  var globals = getGlobals(executionNumber);
  var stepInfo = info[stepContent][info[step]];

  if (globals && globals.conductorAlgorithm) {
    var t2 = p.stopWatch();
    globals.step = info[step] -1;
    var x = new Function("a", "b", "c", "return " + globals.conductorAlgorithm + "(a,b,c);");
    var resultName = generateResultCollectionName(globals.graphName, executionNumber);
    x(new pregel.GraphAccess(resultName, stepInfo),globals, stepInfo);
    saveGlobals(executionNumber, globals);
    p.storeWatch("SuperStepAlgo", t2);
  }

  if( stepInfo[active] > 0 || stepInfo[messages] > 0) {
    p.storeWatch("initNextStep", t);
    startNextStep(executionNumber);
  } else {
    p.storeWatch("initNextStep", t);
    cleanUp(executionNumber);
  }
};


var createResultGraph = function (graph, executionNumber, noCreation) {
  var t = p.stopWatch();
  var properties = graph._getCollectionsProperties();
  var map = {};
  var tmpMap = {
    edge: {},
    vertex: {}
  };
  var shardKeyMap = {};
  var shardMap = [];
  var serverShardMap = {};
  var serverResultShardMap = {};
  var numShards = 1;
  Object.keys(properties).forEach(function (collection) {
    var mc = {};
    map[collection] = mc;
    var mprops = properties[collection];
    mc.type = mprops.type;
    mc.resultCollection = generateResultCollectionName(collection, executionNumber);
    if (ArangoServerState.isCoordinator()) {
      mc.originalShards =
        ArangoClusterInfo.getCollectionInfo(db._name(), collection).shards;
      mc.shardKeys = mprops.shardKeys;
    } else {
      mc.originalShards = {};
      mc.originalShards[collection]= "localhost";
      mc.shardKeys = [];
    }
    shardKeyMap[collection] = _.clone(mc.shardKeys);
    if (mc.type === 2) {
      tmpMap.vertex[collection] = Object.keys(mc.originalShards);
      shardMap = shardMap.concat(tmpMap.vertex[collection]);
      numShards = tmpMap.vertex[collection].length;
      _.each(mc.originalShards, function(server, shard) {
        serverShardMap[server] = serverShardMap[server] || {};
        serverShardMap[server][collection] = serverShardMap[server][collection] || [];
        serverShardMap[server][collection].push(shard);
      });
    } else {
      tmpMap.edge[collection] = Object.keys(mc.originalShards);
      shardMap = shardMap.concat(tmpMap.edge[collection]);
    }
    var props = {
      numberOfShards : mprops.numberOfShards,
      shardKeys : mprops.shardKeys,
      distributeShardsLike : collection
    };
    if (!noCreation) {
      var newCol;
      if (mc.type === 2) {
        newCol = db._create(generateResultCollectionName(collection, executionNumber) , props);
        newCol.ensureSkiplist("deleted");
      } else {
        newCol = db._createEdgeCollection(
          generateResultCollectionName(collection, executionNumber) , props
        );
      }
      newCol.ensureSkiplist("active");
    }
    if (ArangoServerState.isCoordinator()) {
      mc.resultShards =
        ArangoClusterInfo.getCollectionInfo(
          db._name(), generateResultCollectionName(collection, executionNumber)
        ).shards;
    } else {
      var c = {};
      c[generateResultCollectionName(collection, executionNumber)] = "localhost";
      mc.resultShards = c;
    }
    _.each(mc.resultShards, function(server, shard) {
      if (mc.type === 2) {
        serverResultShardMap[server] = serverResultShardMap[server] || {};
        serverResultShardMap[server][collection] = serverResultShardMap[server][collection] || [];
        serverResultShardMap[server][collection].push(shard);
      }
    });
  });
  var lists = [];
  var j;
  var list;
  for (j = 0; j < numShards; j++) {
    list = [];
    _.each(tmpMap.edge, function(edgeShards) {
      list.push(edgeShards[j]);
    });
    lists.push(list);
  }
  var edgeShards = {};
  _.each(tmpMap.vertex, function(shards) {
    _.each(shards, function(sId, index) {
      edgeShards[sId] = lists[index];
    });
  });
  var resMap = {
    shardKeyMap: shardKeyMap,
    shardMap: shardMap,
    serverResultShardMap: serverResultShardMap,
    serverShardMap: serverShardMap,
    edgeShards: edgeShards,
    map: map
  };
  // Create Vertex -> EdgeShards Mapping
  if (noCreation) {
    p.storeWatch("SetupResultGraph", t);
    return resMap;
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
  p.storeWatch("SetupResultGraph", t);
  return resMap;
};


var startExecution = function(graphName, algorithms,  options) {
  var t = p.stopWatch();
  var graph = graphModule._graph(graphName), infoObject = {},
    stepContentObject = {};
  var pregelAlgorithm = algorithms.base;
  var conductorAlgorithm = algorithms.superstep;
  var aggregator = algorithms.aggregator;
  infoObject[waitForAnswer] = getWaitForAnswerMap();
  infoObject[step] = 0;
  options = options  || {};
  options.conductorAlgorithm = conductorAlgorithm;
  options.graphName = graphName;
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
    var x = new Function("(" + pregelAlgorithm + "())");
    /*jslint evil : false */
  } catch (e) {
    var err = new ArangoError();
    err.errorNum = arangodb.errors.ERROR_BAD_PARAMETER.code;
    err.errorMessage = arangodb.errors.ERROR_BAD_PARAMETER.message;
    throw err;
  }

  options.algorithm = pregelAlgorithm;
  if (aggregator) {
    options.aggregator = aggregator;
  }

  options.map = createResultGraph(graph, key);
  p.storeWatch("startExecution", t);
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
  var t = p.stopWatch();
  executionNumber = String(executionNumber);
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
      var transInfo = params.info;
      var transGetExecutionInfo = params.getExecutionInfo;
      var transUpdateExecutionInfo = params.updateExecutionInfo;
      var transExecutionNumber = params.executionNumber;
      var transRunInfo = _.clone(transGetExecutionInfo(transExecutionNumber));
      var transStep = transRunInfo[step] + 1;
      transRunInfo[stepContent][transStep].messages += transInfo.messages;
      transRunInfo[stepContent][transStep].active += transInfo.active;
      transRunInfo.error = transInfo.error;
      var transServerName = params.serverName;
      var transAwaiting = transRunInfo[waitForAnswer];
      transAwaiting[transServerName] = true;
      transUpdateExecutionInfo(transExecutionNumber, transRunInfo);
      var transEveryServerResponded = true;
      Object.keys(transAwaiting).forEach(function(s) {
        if (transAwaiting[s] === false) {
          transEveryServerResponded = false;
        }
      });
      return {
        respond: transEveryServerResponded,
        error: transRunInfo.error,
        active: transRunInfo[stepContent][transStep].active
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
    p.storeWatch("finishedStepConductor", t);
    initNextStep(executionNumber);
  } else if (checks.respond) {
    if (ArangoServerState.isCoordinator()) {
      tasks.unregister(genTaskId(executionNumber));
    }
    p.storeWatch("finishedStepConductor", t);
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
