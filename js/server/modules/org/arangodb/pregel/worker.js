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
var _ = require("underscore");
var db = internal.db;
var arangodb = require("org/arangodb");
var pregel = require("org/arangodb/pregel");
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
var CONDUCTOR = "conductor";
var MAP = "map";
var id;

var queryInsertDefaultEdge = "FOR v IN @@original INSERT {"
  + "'_key' : v._key, 'deleted' : false, 'result' : {}, "
  + "'_from' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._from).collection, @collectionMapping), "
  + "'/', PARSE_IDENTIFIER(v._from).key), "
  + "'_to' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._to).collection, @collectionMapping), "
  + "'/', PARSE_IDENTIFIER(v._to).key)"
  + "} INTO  @@result";

var queryInsertDefaultVertex = "FOR v IN @@original INSERT {"
  + "'_key' : v._key, 'active' : true, 'deleted' : false, 'result' : {} "
  + "} INTO  @@result";

var queryActivateVertices = "FOR v IN @@work UPDATE PARSE_IDENTIFIER(v._to).key WITH " +
  "{'active' : true} IN @@result";


var registerFunction = function(executionNumber, algorithm) {

  var taskToExecute = "(function (params) {"
    + "var executionNumber = params.executionNumber;"
    + "var step = params.step;"
    + "var vertexid = params.vertexid;"
    + "var pregel = require('org/arangodb/pregel');"
    + "var worker = pregel.Worker;"
    + "var vertex = new pregel.Vertex(executionNumber, vertexid);"
    + "var messages = new pregel.MessageQueue(executionNumber, vertexid, step);"
    + "var global = {"
    +   "step: step"
    + "};"
    + "(" + algorithm + "(vertex, messages, global));"
    + "worker.vertexDone(executionNumber, vertex, global);"
    + "})";

    // This has to be replaced by worker registry
    var col = pregel.getGlobalCollection(executionNumber);
    col.save({_key: "task", task: taskToExecute});

};

var addTask = function (executionNumber, stepNumber, vertex, options) {
  var col = pregel.getGlobalCollection(executionNumber);
  var task = col.document("task").task;
  tasks.register({
    id: executionNumber + "_" + stepNumber + "_" + vertex,
    name: "Pregel",
    command: task,
    params: { executionNumber: executionNumber, step: stepNumber,  vertexid : vertex}
  });
};

var saveMapping = function(executionNumber, map) {
  pregel.getGlobalCollection(executionNumber).save({_key: MAP, map: map});
};

var loadMapping = function(executionNumber) {
  return pregel.getGlobalCollection(executionNumber).document(MAP).map;
};

var getConductor = function(executionNumber) {
  return pregel.getGlobalCollection(executionNumber).document(CONDUCTOR).name;
};

var setup = function(executionNumber, options) {
  // create global collection
  db._create(pregel.genWorkCollectionName(executionNumber));
  db._create(pregel.genMsgCollectionName(executionNumber)).ensureHashIndex("toShard");
  var global = db._create(pregel.genGlobalCollectionName(executionNumber));
  global.save({_key: COUNTER, count: -1});
  global.save({_key: CONDUCTOR, name: options.conductor});
  saveMapping(executionNumber, options.map);
  var collectionMapping = {};
  _.each(options.map, function(mapping, collection) {
    collectionMapping[collection] = mapping.resultCollection;
    var shards = Object.keys(mapping.originalShards);
    var resultShards = Object.keys(mapping.resultShards);
    var i;
    var bindVars;
    for (i = 0; i < shards.length; i++) {
      if (mapping.originalShards[shards[i]] === pregel.getServerName()) {
        bindVars = {
          '@original' : shards[i],
          '@result' : resultShards[i]
        };
        if (mapping.type === 3) {
          bindVars.collectionMapping = collectionMapping;
          db._query(queryInsertDefaultEdge, bindVars).execute();
        } else {
          db._query(queryInsertDefaultVertex, bindVars).execute();
        }
      }
    }
  });
  registerFunction(executionNumber, options.algorithm);
};


var activateVertices = function(executionNumber) {
  var map = loadMapping(executionNumber);
  Object.keys(map).forEach(function (collection) {
    var resultShards = Object.keys(map[collection].resultShards);
    var i;
    var bindVars;
    for (i = 0; i < resultShards.length; i++) {
      if (map[collection].resultShards[resultShards[i]] === id) {
        if (map[collection].type === 2) {
          bindVars = {
            '@work' : pregel.genWorkCollectionName(executionNumber),
            '@result' : resultShards[i]
          };
          db._query(queryActivateVertices, bindVars).execute();
        }
      }
    }
  });
};

///////////////////////////////////////////////////////////
/// @brief Creates a cursor containing all active vertices
///////////////////////////////////////////////////////////
var getActiveVerticesQuery = function (executionNumber) {
  var map = loadMapping(executionNumber);
  var count = 0;
  var bindVars = {};
  var server = pregel.getServerName();
  var query = "FOR u in UNION([]";
  Object.keys(map).forEach(function (collection) {
    var resultShards = Object.keys(map[collection].resultShards);
    var i;
    for (i = 0; i < resultShards.length; i++) {
      if (map[collection].resultShards[resultShards[i]] === server) {
        if (map[collection].type === 2) {
          query += ",(FOR i in @@collection" + count
            + " FILTER i.active == true && i.deleted == false"
            + " RETURN i._id)";
          bindVars["@collection" + count] = resultShards[i];
        }
        count++;
      }
    }
  });
  query += ") RETURN u";
  return db._query(query, bindVars);
};

var executeStep = function(executionNumber, step, options) {
  id = ArangoServerState.id() || "localhost";
  if (step === 0) {
    setup(executionNumber, options);
  }
  activateVertices(executionNumber);
  var q = getActiveVerticesQuery(executionNumber);
  // read full count from result and write to work
  var col = pregel.getGlobalCollection(executionNumber);
  col.update(COUNTER, {count: q.count()});
  while (q.hasNext()) {
    addTask(executionNumber, step, q.next(), options);
  }
};


var cleanUp = function(executionNumber) {

  db._drop(pregel.genWorkCollectionName(executionNumber));
  db._drop(pregel.genMsgCollectionName(executionNumber));
  db._drop(pregel.genGlobalCollectionName(executionNumber));
};

var sendMessages = function (executionNumber) {
  var msgCol = pregel.getMsgCollection(executionNumber);
  var workCol = pregel.getWorkCollection(executionNumber);
  if (ArangoServerState.role() === "PRIMARY") {
    // Clusteur
  } else {
    var cursor = msgCol.all();
    var next;
    while(cursor.hasNext()) {
      next = cursor.next();
      workCol.save(next._from, next._to, next);
    }
    msgCol.truncate();
  }
};

var vertexDone = function (executionNumber, vertex, global) {
  vertex._save();
  var globalCol = pregel.getGlobalCollection(executionNumber);
  var counter = globalCol.document(COUNTER).count;
  counter--;
  globalCol.update(COUNTER, {count: counter});

  if (counter === 0) {
    var messages = pregel.getMsgCollection(executionNumber).count(); 
    var active = getActiveVerticesQuery(executionNumber).count();
    sendMessages(executionNumber);
    if (ArangoServerState.role() === "PRIMARY") {
      var conductor = getConductor(executionNumber);
      var body = JSON.stringify({
        server: pregel.getServerName(),
        step: global.step,
        executionNumber: executionNumber,
        messages: messages,
        active: active
      });
      ArangoClusterComm.asyncRequest("POST","server:" + conductor, db._name(),
        "/_api/pregel/finishedStep", body, {}, {});
    } else {
      pregel.Conductor.finishedStep(executionNumber, pregel.getServerName(), {
        step: global.step,
        messages: messages,
        active: active
      });
    }
  }

  
};


// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.executeStep = executeStep;
exports.cleanUp = cleanUp;
exports.vertexDone = vertexDone;
