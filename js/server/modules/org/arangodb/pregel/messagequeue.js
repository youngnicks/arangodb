/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports*/
/*global KEY_GET, KEYSPACE_KEYS, KEY_REMOVE*/

////////////////////////////////////////////////////////////////////////////////
/// @brief Pregel module. Offers all submodules of pregel.
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
/// @author Michael Hackstein
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////
var db = require("internal").db;
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var joinMessageObject = function(v, oldV, aggFunc) {
  'use strict';
  var aggregate = v[0];
  var plain = v[1];
  var oldAggr = oldV[0];
  var oldPlain = oldV[1];
  if (aggregate !== null) {
    if (oldAggr !== null) {
      oldV[0] = aggFunc(aggregate, oldAggr);
    } else {
      oldV[0] = aggregate;
    }
  }
  oldV[1] = oldPlain.concat(plain);
};


var VertexMessageQueue = function(parent) {
  'use strict';
  this._parent = parent;
};


////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_count
/// @brief **VertexMessageQueue.count**
///
/// `pregel.VertexMessageQueue.count()`
///
/// Returns the amount of messages in the vertex message queue.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueCount}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo :
///   {_id : 1}}, {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.count();
///   vertexMessageQueue._fill({plain : "This is a message"});
///   vertexMessageQueue.count();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype.count = function () {
  'use strict';
  return this._inc.length;
};

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_hasNext
/// @brief **VertexMessageQueue.hasNext**
///
/// `pregel.VertexMessageQueue.hasNext()`
///
/// Returns true if the message queue contains more messages.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueuehasNext}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.hasNext();
///   vertexMessageQueue._fill({plain : "This is a message"});
///   vertexMessageQueue.hasNext();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype.hasNext = function () {
  'use strict';
  return this._pos < this.count();
};

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_next
/// @brief **VertexMessageQueue.next**
///
/// `pregel.VertexMessageQueue.next()`
///
/// Returns the next message in the vertex message queue.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueNext}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.next();
///   vertexMessageQueue._fill({plain : "This is a message"});
///   vertexMessageQueue.next();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype.next = function () {
  'use strict';
  if (!this.hasNext()) {
    return null;
  }
  var next = this._inc[this._pos];
  this._pos++;
  return next;
};

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_fill
/// @brief **VertexMessageQueue._fill**
///
/// `pregel.VertexMessageQueue._fill(msg)`
///
/// Adds a message to the vertex' message queue.
///
/// @PARAMS
/// @PARAM{msg, object, required} : The message to be added to the queue, can be a string or any object.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueFill}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.next();
///   vertexMessageQueue._fill({plain : "This is a message"});
///   vertexMessageQueue.next();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype._fill = function (msg) {
  'use strict';
  if (msg.a) {
    this._inc.push({data: msg.a});
  }
  if (msg.plain) {
    this._inc = this._inc.concat(msg.plain);
  }
};

////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_clear
/// @brief **VertexMessageQueue._clear**
///
/// `pregel.VertexMessageQueue._clear()`
///
/// Empties the message queue.
///
/// @EXAMPLES
///
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueClear}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.count();
///   vertexMessageQueue._fill({plain : "This is a message"});
///   vertexMessageQueue.count();
///   vertexMessageQueue._clear();
///   vertexMessageQueue.count();
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype._clear = function () {
  'use strict';
  this._inc = [];
  this._pos = 0;
};


////////////////////////////////////////////////////////////////////////////////
/// @startDocuBlock JSF_pregel_vertex_message_sendTo
/// @brief **VertexMessageQueue.sendTo**
///
/// `pregel.VertexMessageQueue.sendTo(target, data, sendLocation)`
///
/// Sends a message to a vertex defined by target.
///
/// @PARAMS
/// @PARAM{target, object, required} : The recipient of the message, has to be a location array containing
/// a *_key* as first element and *shard* as second.
/// @PARAM{data, object, required} : The message's content, can be a string or an object.
/// @PARAM{sendLocation, boolean, optional} : If false the location array of the sender is not added.
/// as *sender* to the message.
///
/// @EXAMPLES
///
/// Send a message with information about the sender.
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueSendTo}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.sendTo({_id : 2, shard : "shard"}, {msg : "This is a message"});
///   queue.__output;
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// Send a message without information about the sender.
/// @EXAMPLE_ARANGOSH_OUTPUT{pregelVertexMessageQueueSendToWithoutSender}
/// ~  var pregel = require("org/arangodb/pregel");
/// | var queue = new pregel.MessageQueue(1, [{_doc : {_id : 1}, _locationInfo : {_id : 1}},
///   {_doc : {_id : 2}, _locationInfo : {_id : 2}}]);
///   var vertexMessageQueue = queue[1];
///   vertexMessageQueue.sendTo({_id : 2, shard : "shard"}, {msg : "This is a message"}, false);
///   queue.__output;
/// @END_EXAMPLE_ARANGOSH_OUTPUT
/// @endDocuBlock
///
////////////////////////////////////////////////////////////////////////////////
VertexMessageQueue.prototype.sendTo = function (target, data, sendLocation) {
  'use strict';
  var key = target[0];
  if (!(key && typeof key === "string")) {
    var err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_NO_TARGET_PROVIDED.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_NO_TARGET_PROVIDED.message;
    throw err;
  } 
  if (sendLocation !== false) {
    this._parent._send(target, {data: data}, this._vertexInfo);
    return;
  }
  this._parent._send(target, {data: data});
};

VertexMessageQueue.prototype._loadVertex = function (msgObj, vertexInfo) {
  'use strict';
  this._vertexInfo = vertexInfo;
  this._pos = 0;
  this._inc = msgObj[1];
  if (msgObj[0] !== null) {
    this._inc.push({data: msgObj[0]});
  }
};

// End of Vertex Message queue

var Queue = function (executionNumber, vertices, inboxSpaces, localShardList,
    globalShardList, workerCount, mapping, aggregate) {
  'use strict';
  this.__vertices = vertices;
  this.__executionNumber = executionNumber;
  this.__spaces = inboxSpaces;
  this.__inbox = {};
  this.__outbox = {};
  this.__mapping = mapping;
  var i,j,shard;
  for (i = 0; i < globalShardList.length; ++i) {
    this.__outbox[i] = [];
    for (j = 0; j < workerCount; ++j) {
      this.__outbox[i].push({count :0});
    }
  }
  var hashFunc = db[globalShardList[localShardList[0]]].NTH3;
  this.__hash = function(key) {
    return hashFunc(key, workerCount);
  };
  for (i = 0; i < localShardList.length; ++i) {
    shard = localShardList[i];
    this.__inbox[shard] = {};
  }
  this.__step = -1;
  if (aggregate) {
    this.__aggregate = aggregate;
  }
  this.__queue = new VertexMessageQueue(this);
};

Queue.prototype._loadVertex = function(shard, vertex) {
  'use strict';
  var msgObj = this.__inbox[shard][vertex._key] || [null, []];
  this.__queue._loadVertex(msgObj, vertex._getLocationInfo());
  return this.__queue;
};

Queue.prototype._fillQueues = function () {
  'use strict';
  this.__step++;
  var space = this.__spaces[this.__step % 2];
  var keys = KEYSPACE_KEYS(space);
  var msg;
  var aggFunc = this.__aggregate;
  var inbox = this.__inbox;
  var i, key, shard, old, k, shardId;
  for (i = 0; i < keys.length; ++i) {
    key = keys[i];
    msg = KEY_GET(space, key);
    KEY_REMOVE(space, key);
    shard = key.substr(key.lastIndexOf("_") + 1);
    shardId = this.__mapping.getShardId(shard);
    old = inbox[shardId];
    for (k in msg) {
      if (msg.hasOwnProperty(k)) {
        if (!old.hasOwnProperty(k)) {
          old[k] = [null, []];
        }
        joinMessageObject(msg[k], old[k], aggFunc);
      }
    }
  }
};

//msg has data and optionally sender
Queue.prototype._send = function (target, msg, sender) {
  'use strict';
  var key = target[0];
  var shard = target[1];
  var workerId = this.__hash(key);
  var outbox = this.__outbox[shard][workerId];
  if (!outbox.hasOwnProperty(key)) {
    outbox[key] = [null, []];
  }
  if (sender) {
    msg.sender = sender;
  }
  if (sender || !this.__aggregate) {
    outbox[key][1].push(msg);
  } else {
    outbox[key][0] = this.__aggregate(msg.data, outbox[key][0]);
  }
  outbox.count++;
};

Queue.prototype._dump = function(shard, workerId) {
  'use strict';
  delete this.__outbox[shard][workerId].count;
  var res = this.__outbox[shard][workerId];
  this.__outbox[shard][workerId] = {count : 0};
  return res;
};

Queue.prototype._count = function(shardList, workers) {
  'use strict';
  var res = 0, i, j;
  for (j = 0; j < shardList.length; ++j) {
    for (i = 0; i < workers; i++) {
      res = res + this.__outbox[j][i].count;
    }
  }
  return res;
};

Queue.prototype._getShardList = function() {
  'use strict';
  return Object.keys(this.__outbox);
};

Queue.prototype._integrateMessage = function(shard, workerId, incMessage) {
  'use strict';
  var old = this.__outbox[shard][workerId];
  var aggFunc = this.__aggregate;
  var k;
  for (k in incMessage) {
    if (incMessage.hasOwnProperty(k)) {
      if (!old.hasOwnProperty(k)) {
        old[k] = [null, []];
      }
      joinMessageObject(incMessage[k], old[k], aggFunc);
    }
  }
};

Queue.prototype._clear = function(shard, vertex) {
  'use strict';
  this.__inbox[shard][vertex._key] = [null, []];
};

exports.MessageQueue = Queue;
