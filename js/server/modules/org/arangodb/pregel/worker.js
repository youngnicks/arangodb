/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, ArangoClusterComm, ArangoServerState, ArangoClusterInfo */
/*global KEYSPACE_CREATE, KEYSPACE_DROP, KEY_SET, KEY_INCR, KEY_GET, KEY_REMOVE */

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
var arangodb = require("org/arangodb");
var pregel = require("org/arangodb/pregel");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;
var tasks = require("org/arangodb/tasks");
var Foxx = require("org/arangodb/foxx");

var COUNTER = "counter";
var DATA = "data";
var ERR = "error";
var CONDUCTOR = "conductor";
var id;
var WORKERS = 4;

var getInboxName = function (execNr, step, workerId) {
  'use strict';
  return "In_P_" + execNr + "_" + (step % 2) + "_" + workerId;
};

var getOutboxName = function (execNr, firstW, secondW) {
  'use strict';
  return "Out_P_" + execNr + "_" + firstW + "_" + secondW;
};

var getQueueName = function (executionNumber, counter) {
  'use strict';
  return "P_QUEUE_" + executionNumber + "_" + counter;
};

var receiveMessages = function(executionNumber, shard, step, senderName, senderWorker, msg) {
  'use strict';
  var i = 0;
  var buckets = [];
  var col = db[shard];
  for (i = 0; i < WORKERS; i++) {
    buckets.push({});
  }
  var k;
  for (k in msg) {
    if (msg.hasOwnProperty(k)) {
      buckets[col.NTH3(k, WORKERS)][k] = msg[k];
      delete msg[k];
    }
  }
  var inbox;
  for (i = 0; i < WORKERS; i++) {
    inbox = getInboxName(executionNumber, step, i);
    KEY_SET(inbox,  senderName + "_" + senderWorker + "_" + shard, buckets[i]);
    buckets[i] = null;
  }
};

var createScope = function (execNr, wId, inbox, algorithms) {
  'use strict';
  var pregelMapping = new pregel.Mapping(execNr);
  var vertices = new pregel.VertexList(pregelMapping);
  var localShards = pregelMapping.getLocalShards();
  var globalShards = pregelMapping.getGlobalShards();
  var i, shard, index;
  for (i = 0; i < localShards.length; i++) {
    index = localShards[i];
    shard = globalShards[index];
    vertices.addShardContent(index, pregelMapping.findOriginalCollection(index),
      db[shard].NTH2(wId, WORKERS).documents);
  }
  var queue = new pregel.MessageQueue(execNr, vertices,
    inbox, localShards, globalShards, WORKERS, pregelMapping, algorithms.combiner);
  var scope = {
    executionNumber: execNr,
    vertices: vertices,
    worker: this,
    algorithm: algorithms.algorithm,
    finalAlgorithm: algorithms.finalAlgorithm,
    data: [],
    workerId: wId,
    shardList: globalShards,
    queue: queue
  };
  return scope;
};

var algorithmForQueue = function (algorithms, executionNumber, wIndex, inbox) {
  'use strict';
  return "(function() {"
    + "var pregel = require('org/arangodb/pregel');"
    + "var worker = pregel.Worker;"
    + "var paramAlgo = {"
    +   "algorithm:(" + algorithms.algorithm + "),"
    +   "finalAlgorithm:(" + algorithms.final + "),"
    +   "combiner:" + (algorithms.hasOwnProperty("combiner") ? "(" + algorithms.combiner + ")" : "null")
    + "};"
    + "var scope = worker.createScope("
    +   executionNumber + ","
    +   wIndex + ","
    +   JSON.stringify(inbox) + ","
    +   "paramAlgo);"
    + "return worker.workerCode.bind(scope);"
    + "}())";
};

var addTask = function (queue, stepNumber, globals) {
  'use strict';
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

if (!pregel.isClusterSetup()) {
  // Define code which has to be executed in a local setup
  /*
  var jobRegisterQueue = Foxx.queues.create("pregel-register-jobs-queue", WORKERS);
  */


  sendMessages = function (queue, shardList, workerId, step, execNr) {
    'use strict';
    var i, shard;
    for (i = 0; i < shardList.length; i++) {
      shard = shardList[i];
      receiveMessages(
        execNr,
        shard,
        step,
        "localhost",
        workerId,
        queue._dump(i, workerId)
      );
    }
  };


  createTaskQueue = function (executionNumber, algorithms, globals, wIndex, inbox) {
    'use strict';
    KEYSPACE_CREATE("P_" + executionNumber, 2, true);
    KEY_SET("P_" + executionNumber, "done", 0);
    var jobRegisterQueue = Foxx.queues.get("pregel-register-jobs-queue");
    jobRegisterQueue.push("pregel-register-job", {
      queueName: getQueueName(executionNumber, wIndex),
      worker: algorithmForQueue(algorithms, executionNumber, wIndex, inbox),
      globals: globals
    });
  };

} else {
  // Define code which has to be executed in a cluster setup
  sendMessages = function (queue, shardList, workerId, step, execNr) {
    'use strict';
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
        msg: JSON.stringify(queue._dump(i, workerId))
      };
      waitCounter++;
      ArangoClusterComm.asyncRequest("POST","shard:" + shard, dbName,
        "/_api/pregel/message", JSON.stringify(body), {}, coordOptions);
    }
    for (waitCounter; waitCounter > 0; waitCounter--) {
      ArangoClusterComm.wait(coordOptions);
    }

  };
 
  createTaskQueue = function (executionNumber, algorithms, globals, workerIndex, inbox) {
    'use strict';
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
        worker: algorithmForQueue(algorithms, executionNumber, workerIndex, inbox),
        globals: globals,
      }
    });
  };
}

var createOutboxMatrix = function (execNr) {
  'use strict';
  var i, j;
  for (i = 0; i < WORKERS; i++) {
    for (j = 0; j < WORKERS; j++) {
      if (j !== i) {
        KEYSPACE_CREATE(getOutboxName(execNr, i, j));
      }
    }
  }
};


var dumpMessages = function(queue, shardList, workerId, execNr) {
  'use strict';
  var i, j, space;
  for (i = 0; i < WORKERS; i++) {
    if (i !== workerId) {
      for (j = 0; j < shardList.length; j++) {
        space = getOutboxName(execNr, workerId, i);
        KEY_SET(space, String(j), JSON.stringify(queue._dump(j, i)));
      }
    }
  }
};

var combineOtherWorkerData = function (queue, shardList, workerId, execNr) {
  'use strict';
  var i, j, space, incMessage;
  for (i = 0; i < WORKERS; i++) {
    if (i !== workerId) {
      for (j = 0; j < shardList.length; j++) {
        space = getOutboxName(execNr, i, workerId);
        incMessage = KEY_GET(space, String(j));
        while (incMessage === undefined) {
          // Wait for other threads to dump data
          require("internal").wait(0.1, false);
          incMessage = KEY_GET(space, String(j));
        }
        KEY_REMOVE(space, String(j));
        queue._integrateMessage(j, workerId, JSON.parse(incMessage));
      }
    }
  }
};


// This funktion is intended to be used in the worker threads.
// It has to get a scope injected, do not use it otherwise.
var workerCode = function (params) {
  'use strict';
  this.vertices.reset();
  if (params.cleanUp) {
    this.vertices.saveAll();
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
    var vertex, isActive, msgCount;
    if (global.final === true) {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        vShard = vertex.getShard();
        if (!vertex._isDeleted()) {
          msgQueue = this.queue._loadVertex(vShard, vertex);
          this.finalAlgorithm(vertex, msgQueue, global);
        }
        this.queue._clear(vShard, vertex);
      }
    } else {
      while(this.vertices.hasNext()) {
        vertex = this.vertices.next();
        vShard = vertex.getShard();
        if (!vertex._isDeleted()) {
          msgQueue = this.queue._loadVertex(vShard, vertex);
          msgCount = msgQueue.count();
          isActive = vertex._isActive();
          if (isActive || msgCount > 0) {
            if (!isActive) {
              vertex._activate();
            }
            this.algorithm(vertex, msgQueue, global);
          }
        }
        this.queue._clear(vShard, vertex);
      }
    }
    var c = this.queue._count(this.shardList, WORKERS);
    // Dump Messages into Key-Value store
    dumpMessages(this.queue, this.shardList, this.workerId, this.executionNumber);

    // Collect Data from Key-Value store and combine
    combineOtherWorkerData(this.queue, this.shardList, this.workerId, this.executionNumber);

    sendMessages(this.queue, this.shardList, this.workerId, step + 1, this.executionNumber);

    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, c);
  } catch (err) {
    this.worker.queueDone(this.executionNumber, global, this.vertices.countActives(),
      this.inbox, 0, err);
  }
};

var addCleanUpTask = function (queue) {
  'use strict';
  tasks.addJob(
    queue,
    {
      cleanUp: true
    }
  );
};

var saveMapping = function(executionNumber, map) {
  'use strict';
  var space = "P_" + executionNumber + "_MAPPING";
  KEYSPACE_CREATE(space, 9);
  KEY_SET(space, "vertexShards" , map[0]);
  KEY_SET(space, "resultVertexShards" , map[1]);
  KEY_SET(space, "serverVertexShards" , map[2][pregel.getServerName()]);
  KEY_SET(space, "edgeShards" , map[3]);
  KEY_SET(space, "resultEdgeShards" , map[4]);
  KEY_SET(space, "serverEdgeShards" , map[5][pregel.getServerName()]);
  KEY_SET(space, "resultCollectionNames" , map[6]);
  KEY_SET(space, "collectionNames" , map[7]);
  KEY_SET(space, "clusterCollections" , map[8]);
};

var getConductor = function(executionNumber) {
  'use strict';
  return pregel.getGlobalCollection(executionNumber).document(CONDUCTOR).name;
};

var getError = function(executionNumber) {
  'use strict';
  return pregel.getGlobalCollection(executionNumber).document(ERR).error;
};

var setup = function(executionNumber, options, globals) {
  'use strict';

  // create global collection
  pregel.createWorkerCollections(executionNumber);
  createOutboxMatrix(executionNumber);
  var global = pregel.getGlobalCollection(executionNumber);
  global.save({_key: COUNTER, count: 0, active: 0});
  global.save({_key: DATA, data: []});
  global.save({_key: ERR, error: undefined});
  global.save({_key: CONDUCTOR, name: options.conductor});

  saveMapping(executionNumber, options.map);

  var w;
  var inbox;
  for (w = 0; w < WORKERS; w++) {
    inbox = [
      getInboxName(executionNumber, 0, w),
      getInboxName(executionNumber, 1, w)
    ];
    KEYSPACE_CREATE(inbox[0]);
    KEYSPACE_CREATE(inbox[1]);
    createTaskQueue(executionNumber, options, globals, w, inbox);
  }
};

var finishedStep = function (executionNumber, global, active, keyList, inbox, countMsg) {
  'use strict';
  var messages = countMsg || 0;
  var error = getError(executionNumber);
  var final = global.final;
  KEY_SET(keyList, "actives", 0);
  KEY_SET(keyList, "messages", 0);
  var k;
  var stepSwitch = global.step % 2;
  var space, s1, s2;
  for (k in inbox) {
    if (inbox.hasOwnProperty(k)) {
      space = inbox[k];
      s1 = space + stepSwitch + "0";
      s2 = space + stepSwitch + "1";
      KEYSPACE_DROP(s1);
      KEYSPACE_DROP(s2);
      KEYSPACE_CREATE(s1);
      KEYSPACE_CREATE(s2);
    }
  }
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
    ArangoClusterComm.wait(coordOptions);
  } else {
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
  'use strict';
  var keyList = "P_" + executionNumber;
  var countDone = KEY_INCR(keyList, "done");
  if (countDone === WORKERS) {
    KEY_SET(keyList, "actives", 0);
    KEY_SET(keyList, "messages", 0);
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
      ArangoClusterComm.wait(coordOptions);
    } else {
      pregel.Conductor.finishedCleanUp(executionNumber, pregel.getServerName());
    }
    db._drop(pregel.genGlobalCollectionName(executionNumber));
  }
};

var queueDone = function (executionNumber, global, actives, inbox, countMsg, err) {
  'use strict';
  if (err && err instanceof ArangoError === false) {
    var error = new ArangoError();
    error.errorNum = ERRORS.ERROR_PREGEL_ALGORITHM_SYNTAX_ERROR.code;
    error.errorMessage = ERRORS.ERROR_PREGEL_ALGORITHM_SYNTAX_ERROR.message + ": " + err;
    err = error;
  }
  var globalCol = pregel.getGlobalCollection(executionNumber);
  if (err) {
    if (!getError(executionNumber)) {
      globalCol.update(ERR, {error: err});
    }
    return;
  }
  var keyList = "P_" + executionNumber;
  var countDone = KEY_INCR(keyList, "done");
  var countActive = KEY_INCR(keyList, "actives", actives);
  var countmessages = KEY_INCR(keyList, "messages", countMsg);

  if (countDone === WORKERS) {
   finishedStep(executionNumber, global, countActive, keyList, inbox, countmessages);
  }
  /*
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
  'use strict';
  id = ArangoServerState.id() || "localhost";
  globals = globals || {};
  globals.final = options.final;
  if (step === 0) {
    setup(executionNumber, options, globals);
    return;
  }
  var i = 0;
  var queue;
  KEY_SET("P_" + executionNumber, "done", 0);
  for (i = 0; i < WORKERS; i++) {
    queue = getQueueName(executionNumber, i);
    addTask(queue, step, globals);
  }
};

var cleanUp = function(executionNumber) {
  'use strict';
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
exports.createScope = createScope;
