/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments, ArangoClusterComm, ArangoServerState, ArangoClusterInfo */
/*global KEYSPACE_CREATE, KEYSPACE_DROP, KEY_SET, KEY_INCR, KEY_GET */

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

var getInboxName = function (execNr, step, workerId) {
  return "In_P_" + execNr + "_" + (step % 2) + "_" + workerId;
};

var getOutboxName = function (execNr, firstW, secondW) {
  return "Out_P_" + execNr + "_" + firstW + "_" + secondW;
};

var getQueueName = function (executionNumber, counter) {
  return "P_QUEUE_" + executionNumber + "_" + counter;
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
    inbox = getInboxName(executionNumber, step, i);
    KEY_SET(inbox,  senderName + "_" + senderWorker + "_" + shard, JSON.stringify(buckets[i]));
    buckets[i] = null;
  }
};

var algorithmForQueue = function (algorithms, localShards, globalShards, executionNumber, wIndex, inbox) {
  return "(function() {"
    + "var execNumber = " + executionNumber + ";"
    + "var p = require('org/arangodb/profiler');"
    + "var db = require('internal').db;"
    + "var pregel = require('org/arangodb/pregel');"
    + "var pregelMapping = new pregel.Mapping(executionNumber);"
    + "var worker = pregel.Worker;"
    + "var data = [];"
    + "var lastStep;"
    + (algorithms.aggregator ? "  var aggregator = (" + algorithms.aggregator + ");" : "var aggregator = null;")
    + "var vertices = new pregel.VertexList(pregelMapping);"
    + "var localShards = " + JSON.stringify(localShards) + ";"
    + "var globalShards = " + JSON.stringify(globalShards) + ";"
    + "var i;"
    + "var shard;"
    + "var wId = " + wIndex + ";"
    + "var wCount = " + WORKERS + ";"
    + "var inbox = " + JSON.stringify(inbox) + ";"
    + "for (i = 0; i < localShardList.length; i++) {"
    +   "shard = localShardList[i];"
    +   "vertices.addShardContent(shard, pregelMapping.findOriginalCollection(shard),"
    +      "db[shard].NTH2(wId, wCount).documents);"
    + "}"
    + "var queue = new pregel.MessageQueue(execNumber, vertices, inbox, localShards, globalShards, wCount, aggregator);"
    + "var scope = {};"
    + "scope.vertices = vertices;"
    + "scope.worker = worker;"
    + "scope.executionNumber = execNumber;"
    + "scope.queue = queue;"
    + "scope.algorithm = (" + algorithms.algorithm + ");"
    + "scope.finalAlgorithm = (" + algorithms.finalAlgorithm + ");"
    + "scope.data = data;"
    + "scope.workerId = workerId;"
    + "scope.shardList = globalShardList;"
    + "return worker.workerCode.bind(scope);"
   + "}())";
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

// Functions that behave differently on local and cluster setups
var sendMessages, createTaskQueue;



if (pregel.isClusterSetup()) {
  // Define code which has to be executed in a local setup
  require("internal").print("Spastenclaus");
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

  sendMessages = function (queue, shardList, workerId, step, execNr) {
    var i, shard;
    for (i = 0; i < shardList.length; i++) {
      shard = shardList[i];
      receiveMessages(
        execNr,
        shard,
        step,
        "localhost",
        workerId,
        queue._dump(shard, workerId)
      );
    }
  };


  createTaskQueue = function (executionNumber, localShards, globalShards, algorithms, globals, wIndex, inbox) {
    KEYSPACE_CREATE("P_" + executionNumber, 2, true);
    KEY_SET("P_" + executionNumber, "done", 0);
    jobRegisterQueue.push("pregel-register-job", {
      queueName: getQueueName(executionNumber, wIndex),
      worker: algorithmForQueue(algorithms, localShards, globalShards,
        executionNumber, wIndex, inbox),
      globals: globals
    });
  };

} else {
  // Define code which has to be executed in a cluster setup
  sendMessages = function (queue, shardList, workerId, step, execNr) {
    // TODO: Improve for local shards
    var waitCounter = 0;
    var coordOptions = {
      coordTransactionID: ArangoClusterInfo.uniqid()
    };
    var dbName = db._name();
    var sender = pregel.getServerName();
    var i, shard, body;
    for (i = 0; i < shardList.length; i++) {
      shard = shardList[i];
      body = {
        execNr: execNr,
        shard: shard,
        step: step,
        sender: sender,
        worker: workerId,
        msg: queue._dump(shard, workerId)
      };
      waitCounter++;
      ArangoClusterComm.asyncRequest("POST","shard:" + shard, dbName,
        "/_api/pregel/message", JSON.stringify(body), {}, coordOptions);
    }
    var debug;
    for (waitCounter; waitCounter > 0; waitCounter--) {
      debug = ArangoClusterComm.wait(coordOptions);
    }

  };
 
  createTaskQueue = function (executionNumber, localShards, globalShards, algorithms, globals, workerIndex, inbox) {
    // TODO hack for cluster setup. Foxx Queues not working...
    KEYSPACE_CREATE("P_" + executionNumber, 2, true);
    KEY_SET("P_" + executionNumber, "done", 0);
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
        worker: algorithmForQueue(algorithms, localShards, globalShards,
          executionNumber, workerIndex, inbox),
        globals: globals,
      }
    });
  };
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

var queryCountStillActiveVertices = "LET c = (FOR i in @@collection"
  + " FILTER i.active == true && i.deleted == false"
  + " RETURN 1) RETURN LENGTH(c)";

var translateId = function (id, mapping) {
  var split = id.split("/");
  var col = split[0];
  var key = split[1];
  return mapping.getResultCollection(col) + "/" + key;
};

var dumpMessages = function(queue, shardList, workerId, execNr) {
  var i, j, space, shard;
  for (i = 0; i < WORKERS; i++) {
    if (i !== workerId) {
      for (j = 0; j < shardList.length; j++) {
        shard = shardList[j];
        space = getOutboxName(execNr, workerId, i);
        KEY_SET(space, shard, queue._dump(shard, i));
      }
    }
  }
};

var aggregateOtherWorkerData = function (queue, shardList, workerId, execNr) {
  var i, j, space, shard, incMessage;
  for (i = 0; i < WORKERS; i++) {
    if (i !== workerId) {
      for (j = 0; j < shardList.length; j++) {
        shard = shardList[j];
        space = getOutboxName(execNr, i, workerId);
        incMessage = KEY_GET(space, shard);
        while (incMessage === undefined) {
          // Wait for other threads to dump data
          require("internal").wait(0);
          incMessage = KEY_GET(space, shard);
        }
        queue._integrateMessage(shard, workerId, JSON.parse(incMessage));
      }
    }
  }
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
  var vShard;
  try {
    var vertex;
    if (global.final === true) {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        vShard = this.vertices.getShardName(vertex.shard);
        msgQueue = this.queue._loadVertex(vShard, vertex);
        this.finalAlgorithm(vertex, msgQueue, global);
        this.queue._clear(vShard, vertex);
      }
    } else {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        vShard = this.vertices.getShardName(vertex.shard);
        msgQueue = this.queue._loadVertex(this.vertices.getShardName(vertex.shard), vertex);
        if (vertex._isActive() || msgQueue.count > 0) {
          vertex._activate();
          this.algorithm(vertex, msgQueue, global);
          this.queue._clear(vShard, vertex);
        }
      }
    }
    // Dump Messages into Key-Value store
    dumpMessages(this.queue, this.shardList, this.workerId, this.executionNumber);

    // Collect Data from Key-Value store and aggregate
    aggregateOtherWorkerData(this.queue, this.shardList, this.workerId, this.executionNumber);

    sendMessages(this.queue, this.shardList, this.workerId, step + 1, this.executionNumber);
    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, this.outbox);
  } catch (err) {
    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, this.outbox, err);
  }
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
  var localShardList = [];
  _.each(pregelMapping.getLocalCollectionShardMapping(), function (shards) {
    localShardList = localShardList.concat(shards);
  });
  var globalShardList = [];
  _.each(pregelMapping.getGlobalCollectionShardMapping(), function (listing) {
    _.each(listing, function (shards) {
      globalShardList = globalShardList.concat(shards);
    });
  });
  var inbox;
  for (w = 0; w < WORKERS; w++) {
    inbox = [
      getInboxName(executionNumber, 0, w),
      getInboxName(executionNumber, 1, w)
    ];
    KEYSPACE_CREATE(inbox[0]);
    KEYSPACE_CREATE(inbox[1]);
    createTaskQueue(executionNumber, localShardList, globalShardList, options, globals, w, WORKERS, inbox);
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

var finishedStep = function (executionNumber, global, active, keyList, inbox) {
  var t = p.stopWatch();
  var messages = 0;
  var error = getError(executionNumber);
  var final = global.final;
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
  if (step === 0) {
    setup(executionNumber, options, globals);
    return;
  }
  var t = p.stopWatch();
  var i = 0;
  var queue;
  KEY_SET("P_" + executionNumber, "done", 0);
  for (i = 0; i < WORKERS; i++) {
    queue = getQueueName(executionNumber, i);
    addTask(queue, step, globals);
  }
  p.storeWatch("AddingAllTasks", t);
};

var cleanUp = function(executionNumber) {
  // queues.delete("P_" + executionNumber); To be done for new queue
  var i, queue;
  KEY_SET("P_" + executionNumber, "done", 0);
  for (i = 0; i < WORKERS; i++) {
    queue = getQueueName(executionNumber, i);
    addCleanUpTask(queue);
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
