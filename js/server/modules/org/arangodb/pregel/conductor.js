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
var time = internal.time;
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
var final = "final";
var state = "state";
var data = "data";
var messages = "messages";
var error = "error";
var stateFinished = "finished";
var stateRunning = "running";
var stateError = "error";
var _ = require("underscore");

function getCollection () {
  return pregel.getCollection();
}

var genTaskId = function (executionNumber) {
  return "Pregel_Task_" + executionNumber;
};

var getExecutionInfo = function(executionNumber) {
  return pregel.getExecutionInfo(executionNumber);
};

var updateExecutionInfo = function(executionNumber, infoObject) {
  return pregel.updateExecutionInfo(executionNumber, infoObject);
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

var startTimer = function (executionNumber) {
  updateExecutionInfo(executionNumber, {timeUsed: {__ongoing: time()}});
};

var storeTime = function (executionNumber, title) {
  var oldTime = getExecutionInfo(executionNumber).timeUsed.__ongoing;
  var updateObj = {timeUsed: {__ongoing: time()}};
  updateObj.timeUsed[title] = Math.round(1000 * (time() - oldTime));
  updateExecutionInfo(executionNumber, updateObj);
};

var clearTimer = function (executionNumber) {
  updateExecutionInfo(executionNumber, {timeUsed: {__ongoing: null}});

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
    }
  } else {
    dbServers = ["localhost"];
    httpOptions.type = "POST";
    require("org/arangodb/pregel").Worker.cleanUp(executionNumber);
  }
  updateExecutionInfo(
    executionNumber, execInfo
  );
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
  var stepInfo = info[stepContent][info[step]];
  info[stepContent].push({
    active: 0,
    data : [],
    messages: 0,
    final: (stepInfo[active] === 0 && stepInfo[messages] === 0)
  });
  info[waitForAnswer] = getWaitForAnswerMap();
  updateExecutionInfo(executionNumber, info);

  var globals = getGlobals(executionNumber);
  if (globals && globals.conductorAlgorithm) {
    var t2 = p.stopWatch();
    globals.step = info[step] -1;
    var x = new Function("a", "b", "return " + globals.conductorAlgorithm + "(a,b);");
    x(globals, stepInfo);
    saveGlobals(executionNumber, globals);
    p.storeWatch("SuperStepAlgo", t2);
  }
  if( stepInfo[active] > 0 || stepInfo[messages] > 0) {
    p.storeWatch("initNextStep", t);
    startNextStep(executionNumber);
  } else if (stepInfo[final] === false && globals && globals.finalAlgorithm)  {
    p.storeWatch("initNextStep", t);
    startNextStep(executionNumber, {final : true});
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
  var resultShards = {};
  var collectionMap = {};
  var numShards = 1;
  var i;
  Object.keys(properties).forEach(function (collection) {
    var mc = {};
    map[collection] = mc;
    var mprops = properties[collection];
    mc.type = mprops.type;
    mc.resultCollection = generateResultCollectionName(collection, executionNumber);
    collectionMap[collection] = mc.resultCollection;
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
    if (mc.type === 2) {
      _.each(mc.resultShards, function(server, shard) {
        serverResultShardMap[server] = serverResultShardMap[server] || {};
        serverResultShardMap[server][collection] = serverResultShardMap[server][collection] || [];
        serverResultShardMap[server][collection].push(shard);
      });
    }
    var origShards = Object.keys(mc.originalShards);
    var resShards = Object.keys(mc.resultShards);
    for (i = 0; i < origShards.length; i++) {
      resultShards[origShards[i]] = resShards[i];
    }
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
  // ShardKeyMap: collection => [shardKeys]
  // ShardMap: collection => [shard]
  // serverResultShardMap: collection => server => [result_shard]
  // serverShardMap: collection => server => [shard]
  // edgeShards: vertexShard => [edgeShards]
  // resultShards: shard => resultShard
  // collectionMap: collection => resultCollection
  var resMap = {
    shardKeyMap: shardKeyMap,
    shardMap: shardMap,
    serverResultShardMap: serverResultShardMap,
    serverShardMap: serverShardMap,
    edgeShards: edgeShards,
    resultShards: resultShards,
    collectionMap: collectionMap,
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


////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_start_execution
/// @brief starts a pregel run on the given graph.
///
/// `pregel.startExecution(graphName, algorithms,  options)`
///
/// Starts the execution of the algorithms defined in *algorithms' on the graph defined
/// by *graphName*.
///
/// @PARAMS
///
/// @PARAM{graphName, string, required} : The name of the graph.
/// @PARAM{algorithms, object, required} : An object containing the required and optional parts of the
///    pregel algorithm as strings.
///   * *base* (required): The pregel algorithm. This has to be a function with the following signature:
///     function (vertex, message, global) {}.
///   * *superstep* (optional): The superstep algorithm, this has to be a function with the following
///     signature: function (globals) {}.
///   * *aggregator* (optional): The aggregator algorithm, this has to be a function with the following
///     signature: function (message, oldMessage) {}.
///   * *final* (optional): The final algorithm, this has to be a function with the following
///     signature: function (vertex, message, global) {}.
/// @PARAM{options, object, optional}
/// An object defining user defined values that are available within the pregel run.
///
///
/// @EXAMPLES
///
/// We write the following pregel job :
/// Step 0 :  Each Vertex sends a message containing the amount of it's neighbors to all neighbors.
/// Step 1 :  Each Vertex multiples the total sum of the amounts with a variable integer provided by options.
///           If the vertex did not receive any message it stores the string "i am so alone" instead of the total sum.
/// Final Step : Each Vertex changes the result from Step 1 to it's inverse.
/// Furthermore the superStep provides a random color to each vertex in each step.
///
/// As we only send one type of message in this job (the amount of neighbors) we can make use of the *aggregator* function
/// So we first define this:
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelStartExecutionAggregator}
/// | var aggregatorAlgorithm = function (message, oldMessage) {
/// |    //We already aggregate the messages for a target vertex to reduce the amount of messages.
/// |    //Note that the vertex might nevertheless receive more than one message as the aggregation only effects one pregel worker.
/// |    return message + oldMessage;
///   };
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
/// Now we define the base pregel algorithm:
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelStartExecutionBase}
/// | var baseAlgorithm  = function (vertex, message, global) {
/// |   var result = vertex._getResult();
/// |   if (global.step === 0) {
/// |     //We initialize an empty list to store the random colors we receive from the superstep
/// |     result.colorList = [];
/// |      //Send message to neighbors without the sender information, we do not care about it here.
/// |     vertex._outEdges.forEach(function (e) {
/// |      message.sendTo(e._targetVertex, vertex._outEdges.length, false);
/// |     });
/// |     //Notice we do not deactivate the vertex because we want him to participate in the next step even if he receives no message.
/// |     return;
/// |   } else if (global.step === 1) {
/// |     result.sum = 0;
/// |     var next;
/// |     while (message.hasNext()) {
/// |       result.sum += next.data;
/// |     }
/// |     if (result.sum === 0) {
/// |       result.sum = "i am so alone";
/// |     } else {
/// |       result.sum = result.sum * global.someInteger;
/// |     }
/// |     vertex._deactivate();
/// |   }
/// |   //Store random color provided by global in each step
/// |   result.colorList.push(global.currentColor);
/// |   vertex._setResult(result);
///   };
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
/// So every vertex would has been deactivated after step 1 and no more messages have been sent. Now the pregel algorithm
/// would normally terminate but we want it to execute a final step.
/// Note: If one wants to exclude vertices completely (even from the final step) one simply calls *vertex._delete()*.
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelStartExecutionFinal}
/// | var finalAlgorithm = function (vertex, message, global) {
/// |   var result = vertex._getResult();
/// |   if (typeof result.sum !== "string") {
/// |     result.sum = 1 / result.sum;
/// |   }
/// |   //Store random color provided by global in each step
/// |   result.colorList.push(global.currentColor);
/// |   vertex._setResult(result);
///   };
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
/// We have to distribute a new random color in each step so we implement a *superstep*;
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelStartExecutionSuperstep}
/// | var superstep = function (globals, stepInfo) {
/// |   if (!globals.usedColors) {
/// |     globals.usedColors = [];
/// |   }
/// |   var newColor;
/// |   while (globals.usedColors.indexOf(newColor) !== -1) {
/// |     newColor = '#' + Math.random().toString(16).substring(2, 8);
/// |     globals.usedColors.push(newColor);
/// |     globals.color = newColor;
/// |   }
///   };
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
/// Now the four algorithms have been defined , we can start a pregel execution:
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelStartExecution}
/// ~ var examples = require("org/arangodb/graph-examples/example-graph.js");
/// ~ var aggregatorAlgorithm = examples.pregelAlgorithm().aggregator;
/// ~ var baseAlgorithm  = examples.pregelAlgorithm().base;
/// ~ var finalAlgorithm = examples.pregelAlgorithm().final;
/// ~ var superstep = examples.pregelAlgorithm().superstep;
/// ~ var pregel = require("org/arangodb/pregel");
///   var g = examples.loadGraph("routeplanner");
/// | var executionNumber =  pregel.Conductor.startExecution("routeplanner",
/// |   {
/// |     base: baseAlgorithm.toString(),
/// |     final : finalAlgorithm.toString(),
/// |     superstep: superstep.toString(),
/// |     aggregator: aggregatorAlgorithm.toString()
/// |   }, {
/// |     someInteger : 10
/// |   }
///   );
///   require("internal").print(executionNumber);
/// ~  var finished = false;
/// ~  while (!finished) {finished = pregel.Conductor.getInfo(executionNumber).state === "finished";}
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
///
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
var startExecution = function(graphName, algorithms,  options) {
  var t = p.stopWatch();
  var graph = graphModule._graph(graphName), infoObject = {},
    stepContentObject = {};
  var pregelAlgorithm = algorithms.base;
  var conductorAlgorithm = algorithms.superstep;
  var finalAlgorithm = algorithms.final;
  var aggregator = algorithms.aggregator;
  infoObject[waitForAnswer] = getWaitForAnswerMap();
  infoObject[step] = 0;
  options = options  || {};
  options.conductorAlgorithm = conductorAlgorithm;
  options.finalAlgorithm = finalAlgorithm;
  options.graphName = graphName;
  if (options[timeout]) {
    infoObject[timeout] = options[timeout];
    delete options.timeout;
  }
  infoObject[state] = stateRunning;
  stepContentObject[active] = graph._countVertices();
  stepContentObject[messages] = 0;
  stepContentObject[data] = [];
  stepContentObject[final] = false;
  stepContentObject.time = time();
  infoObject[stepContent] = [stepContentObject, {active: 0 , messages: 0, data : [],  final : false}];
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
  startTimer(key);

  options.algorithm = pregelAlgorithm;
  if (aggregator) {
    options.aggregator = aggregator;
  }

  options.map = createResultGraph(graph, key);
  p.storeWatch("startExecution", t);
  storeTime(key, "Setup");
  startNextStep(key, options);
  return key;
};

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_get_result
/// @brief Result of a pregel execution.
///
/// `pregel.getResult(executionNumber)`
///
/// Returns the result of a pregel execution defined by it's *execution number*.
/// The result is an object containing the final state and the name of the result graph.
///
/// @PARAMS
///
/// @PARAM{executionNumber, string, required} : The execution number of a pregel execution.
///
/// @EXAMPLES
///
/// Execute the example algorithm on the "routeplanner" graph and examine the result.
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelGetResult}
/// ~ var examples = require("org/arangodb/graph-examples/example-graph.js");
/// ~ var aggregatorAlgorithm = examples.pregelAlgorithm().aggregator;
/// ~ var baseAlgorithm  = examples.pregelAlgorithm().base;
/// ~ var finalAlgorithm = examples.pregelAlgorithm().final;
/// ~ var superstep = examples.pregelAlgorithm().superstep;
/// ~ var pregel = require("org/arangodb/pregel");
///   var g = examples.loadGraph("routeplanner");
/// | var executionNumber =  pregel.Conductor.startExecution("routeplanner",
/// |   {
/// |     base: baseAlgorithm.toString(),
/// |     final : finalAlgorithm.toString(),
/// |     superstep: superstep.toString(),
/// |     aggregator: aggregatorAlgorithm.toString()
/// |   }, {
/// |     someInteger : 10
/// |   }
///   );
/// ~  var finished = false;
/// ~  while (!finished) {finished = pregel.Conductor.getInfo(executionNumber).state === "finished";}
///   pregel.Conductor.getResult(executionNumber);
///   var graph_module = require("org/arangodb/general-graph");
///   graph_module._graph(pregel.Conductor.getResult(executionNumber).result.graphName)._vertices().toArray();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
///
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
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


////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_get_info
/// @brief Information about a pregel execution.
///
/// `pregel.getInfo(executionNumber)`
///
/// Returns information about a pregel execution defined by it's *execution number*.
///
/// @PARAMS
///
/// @PARAM{executionNumber, string, required} : The execution number of a pregel execution.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelGetInfo}
/// ~ var examples = require("org/arangodb/graph-examples/example-graph.js");
/// ~ var aggregatorAlgorithm = examples.pregelAlgorithm().aggregator;
/// ~ var baseAlgorithm  = examples.pregelAlgorithm().base;
/// ~ var finalAlgorithm = examples.pregelAlgorithm().final;
/// ~ var superstep = examples.pregelAlgorithm().superstep;
/// ~ var pregel = require("org/arangodb/pregel");
///   var g = examples.loadGraph("routeplanner");
/// | var executionNumber =  pregel.Conductor.startExecution("routeplanner",
/// |   {
/// |     base: baseAlgorithm.toString(),
/// |     final : finalAlgorithm.toString(),
/// |     superstep: superstep.toString(),
/// |     aggregator: aggregatorAlgorithm.toString()
/// |   }, {
/// |     someInteger : 10
/// |   }
///   );
///   pregel.Conductor.getInfo(executionNumber);
/// ~  var finished = false;
/// ~  while (!finished) {finished = pregel.Conductor.getInfo(executionNumber).state === "finished";}
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
///
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
var getInfo = function(executionNumber) {
  var info = getExecutionInfo(executionNumber);
  var result = {};
  result.step = info[step];
  result.state = info[state];
  result.globals = {};

  return result;
};

var finishedCleanupTransactionFunc = function (params) {
  var transExecutionNumber = params.executionNumber;
  var collection = require("internal").db._pregel;
  var transRunInfo = collection.document(transExecutionNumber);
  var transServerName = params.serverName;
  var transAwaiting = transRunInfo.waitForAnswer;
  transAwaiting[transServerName] = true;
  collection.update(transExecutionNumber, transRunInfo);
  var transEveryServerResponded = true;
  Object.keys(transAwaiting).forEach(function(s) {
    if (transAwaiting[s] === false) {
      transEveryServerResponded = false;
    }
  });
  return transEveryServerResponded;
};


var finishedTransActionFunc = function (params) {
  var transInfo = params.info;
  var transExecutionNumber = params.executionNumber;
  var collection = require("internal").db._pregel;
  var transRunInfo = collection.document(transExecutionNumber);
  var transStep = transRunInfo.step + 1;
  // Shaped JSON avoidance
  transRunInfo.stepContent = _.clone(transRunInfo.stepContent);
  var transStepCont = transRunInfo.stepContent[transStep];
  transStepCont.messages += transInfo.messages;
  transStepCont.active += transInfo.active;
  transStepCont.data = transStepCont.data.concat(transInfo.data);
  transRunInfo.stepContent[transStep] = transStepCont;
  transRunInfo.error = transInfo.error;
  var transServerName = params.serverName;
  var transAwaiting = transRunInfo.waitForAnswer;
  transAwaiting[transServerName] = true;
  collection.update(transExecutionNumber, transRunInfo);
  var transEveryServerResponded = true;
  Object.keys(transAwaiting).forEach(function(s) {
    if (transAwaiting[s] === false) {
      transEveryServerResponded = false;
    }
  });
  return {
    respond: transEveryServerResponded,
    error: transRunInfo.error,
    active: transStepCont.active
  };
};

var finishedCleanUp = function(executionNumber, serverName) {
  executionNumber = String(executionNumber);

  var transactionBody = {
    collections: {
      write: [
        "_pregel"
      ]
    },
    action: finishedCleanupTransactionFunc, 
    params: {
      serverName: serverName,
      executionNumber: executionNumber
    }
  };

  var check;

  if (ArangoServerState.isCoordinator()) {
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    var objInfo = ArangoClusterInfo.getCollectionInfo("_system", "_pregel");
    var endpoint = objInfo.shards[Object.keys(objInfo.shards)[0]];
    transactionBody.collections = {
      write: [
        Object.keys(objInfo.shards)[0]
      ]
    };
    transactionBody.params.dbName = Object.keys(objInfo.shards)[0];
    transactionBody.action = transactionBody.action.toString();
    ArangoClusterComm.asyncRequest("POST","server:" + endpoint, db._name(),
      "/_api/transaction/",JSON.stringify(transactionBody), {}, coordOptions);
    check = JSON.parse(ArangoClusterComm.wait(coordOptions).body).result;
  } else {
    check = db._executeTransaction(transactionBody);
  }
  if (check) {
    storeTime(executionNumber, "CleanUp");
    clearTimer(executionNumber);
    if (ArangoServerState.isCoordinator()) {
      tasks.unregister(genTaskId(executionNumber));
    }
  }
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

  var transactionBody = {
    collections: {
      write: [
        "_pregel"
      ]
    },
    action: finishedTransActionFunc,
    params: {
      serverName: serverName,
      executionNumber: executionNumber,
      info: info
    }
  };

  var checks;

  if (ArangoServerState.isCoordinator()) {
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    var objInfo = ArangoClusterInfo.getCollectionInfo("_system", "_pregel");
    var endpoint = objInfo.shards[Object.keys(objInfo.shards)[0]];
    transactionBody.collections = {
      write: [
        Object.keys(objInfo.shards)[0]
      ]
    };
    transactionBody.params.dbName = Object.keys(objInfo.shards)[0];
    transactionBody.action = transactionBody.action.toString();
    ArangoClusterComm.asyncRequest("POST","server:" + endpoint, db._name(),
      "/_api/transaction/",JSON.stringify(transactionBody), {}, coordOptions);
    checks = JSON.parse(ArangoClusterComm.wait(coordOptions).body).result;

  } else {
    checks = db._executeTransaction(transactionBody);
  }
  if (checks.respond && !checks.error) {
    storeTime(executionNumber, "Step" + info.step);
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

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_drop_result
/// @brief Drops the result graph of a pregel execution.
///
/// `pregel.dropResult(executionNumber)`
///
/// Deletes the result graph of a pregel execution including its collections.
/// Furthermore the execution info is deleted from the *_pregel* system collection.
///
/// @PARAMS
///
/// @PARAM{executionNumber, string, required} : The execution number of a pregel execution.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelDropResult}
/// ~ var examples = require("org/arangodb/graph-examples/example-graph.js");
/// ~ var aggregatorAlgorithm = examples.pregelAlgorithm().aggregator;
/// ~ var baseAlgorithm  = examples.pregelAlgorithm().base;
/// ~ var finalAlgorithm = examples.pregelAlgorithm().final;
/// ~ var superstep = examples.pregelAlgorithm().superstep;
/// ~ var pregel = require("org/arangodb/pregel");
///   var g = examples.loadGraph("routeplanner");
/// | var executionNumber =  pregel.Conductor.startExecution("routeplanner",
/// |   {
/// |     base: baseAlgorithm.toString(),
/// |     final : finalAlgorithm.toString(),
/// |     superstep: superstep.toString(),
/// |     aggregator: aggregatorAlgorithm.toString()
/// |   }, {
/// |     someInteger : 10
/// |   }
///   );
/// ~  var finished = false;
/// ~  while (!finished) {finished = pregel.Conductor.getInfo(executionNumber).state === "finished";}
///   var graph_module = require("org/arangodb/general-graph");
///   var resultGraph = pregel.Conductor.getResult(executionNumber).result.graphName;
///   graph_module._graph(resultGraph);
///   pregel.Conductor.dropResult(executionNumber);
///   graph_module._graph(resultGraph);
/// @END_EXAMPLE_ARANGOSH_OUTPUT
///
///
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
var dropResult = function(executionNumber) {
  var info = pregel.getExecutionInfo(executionNumber);
  graphModule._drop(info.graphName, true);
  pregel.removeExecutionInfo(executionNumber);
};

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.startExecution = startExecution;
exports.getResult = getResult;
exports.getInfo = getInfo;
exports.dropResult = dropResult;

// Internal functions
exports.finishedStep = finishedStep;
exports.finishedCleanUp = finishedCleanUp;
exports.timeOutExecution = timeOutExecution;
