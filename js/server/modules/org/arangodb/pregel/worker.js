/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments, ArangoClusterComm, ArangoServerState, ArangoClusterInfo */
/*global KEYSPACE_CREATE, KEYSPACE_DROP, KEY_SET, KEY_INCR */

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

var p = require("org/arangodb/profiler");

var internal = require("internal");
var _ = require("underscore");
var db = internal.db;
var arangodb = require("org/arangodb");
var pregel = require("org/arangodb/pregel");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;
var tasks = require("org/arangodb/tasks");
var Foxx = require("org/arangodb/foxx");

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
var DATA = "data";
var ERR = "error";
var CONDUCTOR = "conductor";
var ALGORITHM = "algorithm";
var MAP = "map";
var id;
var WORKERS = 4;

if (pregel.getServerName() === "localhost") {
  var jobRegisterQueue = Foxx.queues.create("pregel-register-jobs-queue", WORKERS);

  Foxx.queues.registerJobType("pregel-register-job", function(params) {
    var queueName = params.queueName;
    var worker = params.worker;
    var glob = params.globals;
    var tasks = require("org/arangodb/tasks");
    tasks.createNamedQueue({
      name: queueName,
      threads: 1,
      size: 1,
      worker: worker
    });
    tasks.addJob(
      queueName,
      {
        step: 0,
        global: glob
      }
    );
  });
}

var queryGetAllSourceEdges = "FOR e IN @@original RETURN "
  + "{ _key: e._key, _from: e._from, _to: e._to";

var queryInsertDefaultVertex = "FOR v IN @@original INSERT {"
  + " '_key' : v._key, 'active' : true, 'deleted' : false, 'result' : {},"
  + " 'locationObject': { '_id': v._id, 'shard': @origShard }";

var queryInsertDefaultVertexIntoPart = "} INTO  @@result";


var queryActivateVertices = "FOR v IN @@work "
  + "FILTER v.toShard == @shard && v.step == @step "
  + "UPDATE PARSE_IDENTIFIER(v._toVertex).key WITH "
  + "{'active' : true} IN @@result";

var queryMessageByShard = "FOR v IN @@message "
  + "FILTER v.toShard == @shardId "
  + "RETURN v";

var getInboxName = function (execNr, shard, step, workerId) {
  return "In_P_" + execNr + shard + "_" +(step % 2) + "_" + workerId;
};

var getOutboxName = function (execNr, firstW, secondW) {
  return "Out_P_" + execNr + "_" + firstW + secondW;
};

var createOutboxMatrix = function (execNr) {
  var i, j;
  for (i = 0; i < WORKERS; i++) {
    for (j = 0; j < WORKERS; j++) {
      if (j !== i) {
        KEYSPACE_CREATE(getOutboxName(execNr, i, j));
      }
    }
  }
};

var extractShardFromSpace = function (execNr, space) {
  return space.substring(6 + execNr.length, space.lastIndexOf("_"));
};

var queryCountStillActiveVertices = "LET c = (FOR i in @@collection"
  + " FILTER i.active == true && i.deleted == false"
  + " RETURN 1) RETURN LENGTH(c)";

var getQueueName = function (executionNumber, counter) {
  return "P_QUEUE_" + executionNumber + "_" + counter;
};

var translateId = function (id, mapping) {
  var split = id.split("/");
  var col = split[0];
  var key = split[1];
  return mapping.getResultCollection(col) + "/" + key;
};

// This funktion is intended to be used in the worker threads.
// It has to get a scope injected, do not use it otherwise.
var workerCode = function (params) {
  this.vertices.reset();
  if (params.cleanUp) {
    while(this.vertices.hasNext()) {
      this.vertices.next()._save();
    }
    p.aggregate();
    this.worker.queueCleanupDone(this.executionNumber);
    return;
  }
  var step = params.step;
  this.queue._fillQueues();
  var global = params.global;
  var msgQueue;
  global.step = step;
  global.data = this.data;
  try {
    var vertex;
    if (global.final === true) {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        msgQueue = this.queue._loadVertex(this.vertices.getShardName(vertex.shard), vertex);
        this.finalAlgorithm(vertex, msgQueue, global);
      }
    } else {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        msgQueue = this.queue._loadVertex(this.vertices.getShardName(vertex.shard), vertex);
        if (vertex._isActive() || msgQueue.count > 0) {
          vertex._activate();
          this.algorithm(vertex, msgQueue, global);
        }
      }
    }
    this.queue._storeInCollection();
    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, this.outbox);
  } catch (err) {
    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, this.outbox, err);
  }
};

var algorithmForQueue = function (algorithms, shardList, executionNumber, workerIndex, workerCount, inbox, outbox) {
  return "(function() {"
    + "var executionNumber = " + executionNumber + ";"
    + "var p = require('org/arangodb/profiler');"
    + "var db = require('internal').db;"
    + "var pregel = require('org/arangodb/pregel');"
    + "var pregelMapping = new pregel.Mapping(executionNumber);"
    + "var worker = pregel.Worker;"
    + "var data = [];"
    + "var lastStep;"
    + (algorithms.aggregator ? "  var aggregator = (" + algorithms.aggregator + ");" : "var aggregator = null;")
    + "var vertices = new pregel.VertexList(pregelMapping);"
    + "var shardList = " + JSON.stringify(shardList) + ";"
    + "var inbox = " + JSON.stringify(inbox) + ";"
    + "var outbox = " + JSON.stringify(outbox) + ";"
    + "var i;"
    + "var shard;"
    + "for (i = 0; i < shardList.length; i++) {"
    +   "shard = shardList[i];"
    +   "vertices.addShardContent(shard, pregelMapping.findOriginalCollection(shard),"
    +      "db[shard].NTH2(" + workerIndex + ", " + workerCount + ").documents);"
    + "}"
    + "var queue = new pregel.MessageQueue(executionNumber, vertices, aggregator);"
    + "var scope = {};"
    + "scope.vertices = vertices;"
    + "scope.worker = worker;"
    + "scope.executionNumber = executionNumber;"
    + "scope.queue = queue;"
    + "scope.algorithm = (" + algorithms.algorithm + ");"
    + "scope.finalAlgorithm = (" + algorithms.finalAlgorithm + ");"
    + "scope.data = data;"
    + "scope.inbox = inbox;"
    + "scope.outbox = outbox;"
    + "return worker.workerCode.bind(scope);"
   + "}())";
};

var createTaskQueue = function (executionNumber, shardList, algorithms, globals, workerIndex, workerCount, inbox, outbox) {
  // TODO hack for cluster setup. Foxx Queues not working...
  KEYSPACE_CREATE("P_" + executionNumber, 2, true);
  KEY_SET("P_" + executionNumber, "done", 0);
  if (pregel.getServerName() !== "localhost") {
    tasks.register({
      command: function(params) {
        var queueName = params.queueName;
        var worker = params.worker;
        var glob = params.globals;
        var tasks = require("org/arangodb/tasks");
        tasks.createNamedQueue({
          name: queueName,
          threads: 1,
          size: 1,
          worker: worker
        });
        tasks.addJob(
          queueName,
          {
            step: 0,
            global: glob
          }
        );
      },
      params: {
        queueName: getQueueName(executionNumber, workerIndex),
        worker: algorithmForQueue(algorithms, shardList, executionNumber, workerIndex, workerCount, inbox, outbox),
        globals: globals,
      }
    });
  } else {
    jobRegisterQueue.push("pregel-register-job", {
      queueName: getQueueName(executionNumber, workerIndex),
      worker: algorithmForQueue(algorithms, shardList, executionNumber, workerIndex, workerCount, inbox, outbox),
      globals: globals
    });
  }
};

var addTask = function (queue, stepNumber, globals) {
  tasks.addJob(
    queue,
    {
      step: stepNumber,
      global: globals
    }
  );
};

var addCleanUpTask = function (queue) {
  tasks.addJob(
    queue,
    {
      cleanUp: true
    }
  );
};

var saveMapping = function(executionNumber, map) {
  map._key = "map";
  pregel.getGlobalCollection(executionNumber).save(map);
};

var loadMapping = function(executionNumber) {
  return pregel.getMap(executionNumber);
};

var getConductor = function(executionNumber) {
  return pregel.getGlobalCollection(executionNumber).document(CONDUCTOR).name;
};

var getError = function(executionNumber) {
  return pregel.getGlobalCollection(executionNumber).document(ERR).error;
};

var setup = function(executionNumber, options, globals) {
  // create global collection
  pregel.createWorkerCollections(executionNumber);
  createOutboxMatrix(executionNumber);
  p.setup();
  var global = pregel.getGlobalCollection(executionNumber);
  global.save({_key: COUNTER, count: 0, active: 0});
  global.save({_key: DATA, data: []});
  global.save({_key: ERR, error: undefined});
  global.save({_key: CONDUCTOR, name: options.conductor});

  saveMapping(executionNumber, options.map);

  var pregelMapping = new pregel.Mapping(executionNumber);
  var w;
  var shardList = [];
  _.each(pregelMapping.getLocalCollectionShardMapping(), function (shards) {
    shardList = shardList.concat(shards);
  });
  var inbox = {};
  var outbox = {};
  var myName = pregel.getServerName();
  var i;
  var spacePrefix = "P_" + executionNumber + "_";
  _.each(pregelMapping.getGlobalCollectionShardMapping(), function (listing, server) {
    var s;
    if (server === myName) {
      _.each(listing, function (shards) {
        for (i = 0; i < shards.length; ++i) {
          s = shards[i];
          inbox[s] = "In_" + spacePrefix + s;
          // Space for step % 2 === 0
          KEYSPACE_CREATE("In_" + spacePrefix + s + "00"); //0 is aggregate
          KEYSPACE_CREATE("In_" + spacePrefix + s + "01"); //1 is plain
          // Space for step % 2 === 1
          KEYSPACE_CREATE("In_" + spacePrefix + s + "10"); 
          KEYSPACE_CREATE("In_" + spacePrefix + s + "11");
        }
      });
    } else {
      _.each(listing, function (shards) {
        for (i = 0; i < shards.length; ++i) {
          s = shards[i];
          outbox[s] = "Out_" + spacePrefix + s + "0";
          outbox[s] = "Out_" + spacePrefix + s + "1";
          KEYSPACE_CREATE("Out_" + spacePrefix + s + "0");
          KEYSPACE_CREATE("Out_" + spacePrefix + s + "1");
        }
      });
    }
  });
  for (w = 0; w < WORKERS; w++) {
    require("console").log("Creating a fuckng queue");
    createTaskQueue(executionNumber, shardList, options, globals, w, WORKERS, inbox, outbox);
  }
};


var activateVertices = function(executionNumber, step, mapping) {
  var t = p.stopWatch();
  var work = pregel.genWorkCollectionName(executionNumber);
  var resultShardMapping = mapping.getLocalResultShardMapping();
  _.each(resultShardMapping, function (resultShards, collection) {
    var originalShards = mapping.getLocalCollectionShards(collection);
    var i;
    var bindVars;
    for (i = 0; i < resultShards.length; i++) {
      bindVars = {
        '@work': work,
        '@result': resultShards[i],
        'shard': originalShards[i],
        'step': step
      };
      db._query(queryActivateVertices, bindVars).execute();
    }
  });
  p.storeWatch("ActivateVertices", t);
};

///////////////////////////////////////////////////////////
/// @brief Creates a cursor containing all active vertices
///////////////////////////////////////////////////////////
var getActiveVerticesQuery = function (mapping) {
  var count = 0;
  var bindVars = {};
  var query = "FOR u in UNION([], []";
  var resultShardMapping = mapping.getLocalResultShardMapping();
  _.each(resultShardMapping, function (resultShards) {
    var i;
    for (i = 0; i < resultShards.length; i++) {
      query += ",(FOR i in @@collection" + count
        + " FILTER i.active == true && i.deleted == false"
        + " RETURN {_id: i._id, shard: @collection" + count 
        + ", locationObject: i.locationObject, _doc: i})";
      bindVars["@collection" + count] = resultShards[i];
      bindVars["collection" + count] = resultShards[i];
      count++;
    }
  });
  query += ") RETURN u";
  return db._query(query, bindVars);
};

var getVerticesQuery = function (mapping) {
  var count = 0;
  var bindVars = {};
  var query = "FOR u in UNION([], []";
  var resultShardMapping = mapping.getLocalResultShardMapping();
  _.each(resultShardMapping, function (resultShards) {
    var i;
    for (i = 0; i < resultShards.length; i++) {
      query += ",(FOR i in @@collection" + count
        + " FILTER i.deleted == false"
        + " RETURN {_id: i._id, shard: @collection" + count
        + ", locationObject: i.locationObject, _doc: i})";
      bindVars["@collection" + count] = resultShards[i];
      bindVars["collection" + count] = resultShards[i];
      count++;
    }
  });
  query += ") RETURN u";
  return db._query(query, bindVars);
};


var countActiveVertices = function (mapping) {
  var count = 0;
  var bindVars = {};
  var resultShardMapping = mapping.getLocalResultShardMapping();
  _.each(resultShardMapping, function (resultShards) {
    var i;
    for (i = 0; i < resultShards.length; i++) {
      bindVars["@collection"] = resultShards[i];
      count += db._query(queryCountStillActiveVertices, bindVars).next();
    }
  });
  return count;
};

var packOutbox = function(space) {
  var t = p.stopWatch();
  var vertices = KEYSPACE_KEYS(space);
  var msg = {};
  _.each(vertices, function(v) {
    msg[v] = KEY_GET(space, v);
  });
  KEYSPACE_DROP(space);
  KEYPSACE_CREATE(space);
  var res = JSON.stringify(msg);
  p.storeWatch("packingMessage", t);
  return res;
};

var sendMessages = function (executionNumber, outbox, step) {
  var waitCounter = 0;
  var coordOptions = {
    coordTransactionID: ArangoClusterInfo.uniqid()
  };
  var shard, msg, space, aggregate, body;
  var dbName = db._name();
  for (space in outbox) {
    if (outbox.hasOwnProperty(space)) {
      shard = extractShardFromSpace(executionNumber, space);
      aggregate = space.charAt(space.length - 1) === "0";
      msg = packOutbox(outbox[space], shard);
      body = {
        msg: msg,
        aggregate: aggregate,
        shard: shard,
        execNr: executionNumber
      };
      waitCounter++;
      ArangoClusterComm.asyncRequest("POST","shard:" + shard, dbName,
        "/_api/pregel/message", body, {}, coordOptions);
    }
  }
  var debug;
  for (waitCounter; waitCounter > 0; waitCounter--) {
    debug = ArangoClusterComm.wait(coordOptions);
  }
};

var finishedStep = function (executionNumber, global, active, keyList, inbox, outbox) {
  var t = p.stopWatch();
  var messages = 0;
  var error = getError(executionNumber);
  var final = global.final;
  if (!error) {
    var t2 = p.stopWatch();
    // messages = sendMessages(executionNumber, outbox);
    p.storeWatch("ShiftMessages", t2);
  }
  require("console").log("buhman");
  KEY_SET(keyList, "actives", 0);
  _.each(inbox, function (space) {
    var stepSwitch = global.step % 2;
    var s1 = space + stepSwitch + "0";
    var s2 = space + stepSwitch + "1";
    KEYSPACE_DROP(s1);
    KEYSPACE_DROP(s2);
    KEYSPACE_CREATE(s1);
    KEYSPACE_CREATE(s2);
  });
  require("console").log("baumn");
  if (ArangoServerState.role() === "PRIMARY") {
    var conductor = getConductor(executionNumber);
    var body = JSON.stringify({
      server: pregel.getServerName(),
      step: global.step,
      executionNumber: executionNumber,
      messages: messages,
      active: active,
      error: error,
      final : final,
      data : global.data
    });
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    ArangoClusterComm.asyncRequest("POST","server:" + conductor, db._name(),
      "/_api/pregel/finishedStep", body, {}, coordOptions);
    var debug = ArangoClusterComm.wait(coordOptions);
  } else {
    p.storeWatch("FinishStep", t);
    pregel.Conductor.finishedStep(executionNumber, pregel.getServerName(), {
      step: global.step,
      messages: messages,
      active: active,
      error: error,
      final : final,
      data : global.data
    });
  }
};

var queueCleanupDone = function (executionNumber) {
  var keyList = "P_" + executionNumber;
  var countDone = KEY_INCR(keyList, "done");
  if (countDone === WORKERS) {
    KEY_SET(keyList, "actives", 0);
    if (ArangoServerState.role() === "PRIMARY") {
      var conductor = getConductor(executionNumber);
      var body = JSON.stringify({
        server: pregel.getServerName(),
        executionNumber: executionNumber
      });
      var coordOptions = {
        coordTransactionID: ArangoClusterInfo.uniqid()
      };
      ArangoClusterComm.asyncRequest("POST","server:" + conductor, db._name(),
        "/_api/pregel/finishedCleanup", body, {}, coordOptions);
      var debug = ArangoClusterComm.wait(coordOptions);
    } else {
      pregel.Conductor.finishedCleanUp(executionNumber, pregel.getServerName());
    }
  }
  db._drop(pregel.genWorkCollectionName(executionNumber));
  db._drop(pregel.genMsgCollectionName(executionNumber));
  db._drop(pregel.genGlobalCollectionName(executionNumber));
};

var queueDone = function (executionNumber, global, actives, inbox, outbox, err) {
  var t = p.stopWatch();
  if (err && err instanceof ArangoError === false) {
    var error = new ArangoError();
    error.errorNum = ERRORS.ERROR_PREGEL_ALGORITHM_SYNTAX_ERROR.code;
    error.errorMessage = ERRORS.ERROR_PREGEL_ALGORITHM_SYNTAX_ERROR.message + ": " + err;
    err = error;
  }
  var globalCol = pregel.getGlobalCollection(executionNumber);
  if (err && !getError(executionNumber)) {
    globalCol.update(ERR, {error: err});
  }
  var keyList = "P_" + executionNumber;
  var countDone = KEY_INCR(keyList, "done");
  var countActive = KEY_INCR(keyList, "actives", actives);
  p.storeWatch("VertexDone", t);
  if (countDone === WORKERS) {
   finishedStep(executionNumber, global, countActive, keyList, inbox, outbox);
  }
  /*
   WTF? Nochmal nachdenken was das machen soll
      var d = globalCol.document(DATA).data;
        globalCol.update(DATA, {
          data : []
        });
      }
      if (global.data.length > 0) {
        globalCol.update(DATA, {
          data : global.data.concat(d)
        });
      }
    }
  });
  */
};

var executeStep = function(executionNumber, step, options, globals) {
  id = ArangoServerState.id() || "localhost";
  globals = globals || {};
  globals.final = options.final;
  require("console").log("aaqwieou");
  if (step === 0) {
    KEYSPACE_CREATE("RETRY", 1);
    setup(executionNumber, options, globals);
    return;
  }
  var t = p.stopWatch();
  var i = 0;
  var queue;
  KEY_SET("P_" + executionNumber, "done", 0);
  require("console").log("klasjd");
  for (i = 0; i < WORKERS; i++) {
    queue = getQueueName(executionNumber, i);
    addTask(queue, step, globals);
  }
  require("console").log("aaarargh");
  p.storeWatch("AddingAllTasks", t);
};

var cleanUp = function(executionNumber) {
  // queues.delete("P_" + executionNumber); To be done for new queue
  var i, queue;
  KEY_SET("P_" + executionNumber, "done", 0);
  require("console").log("Retried", KEY_GET("RETRY", "count"));
  KEYSPACE_DROP("RETRY");
  for (i = 0; i < WORKERS; i++) {
    queue = getQueueName(executionNumber, i);
    addCleanUpTask(queue);
  }
};

var receiveMessages = function(executionNumber, shard, step, senderName, senderWorker, messageString) {
  var msg = JSON.parse(messageString);
  var i = 0;
  var buckets = [];
  var col = db[shard];
  for (i = 0; i < WORKERS; i++) {
    buckets.push({});
  }
  _.each(msg, function(v, k) {
    buckets[col.NTH3(k, WORKERS)][k] = v;
    delete msg[k];
  });
  var inbox;
  for (i = 0; i < WORKERS; i++) {
    inbox = getInboxName(executionNumber, shard, step, i);
    KEY_SET(inbox,  senderName + "_" + senderWorker, JSON.stringify(buckets[i]));
    buckets[i] = null;
  }
};

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.executeStep = executeStep;
exports.cleanUp = cleanUp;
exports.finishedStep = finishedStep;
exports.queueDone = queueDone;
exports.queueCleanupDone = queueCleanupDone;
exports.receiveMessages = receiveMessages;

// Private. Do never use externally
exports.workerCode = workerCode;
