/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports*/

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
var _ = require("underscore");
var pregel = require("org/arangodb/pregel");
var query = "FOR m IN @@collection FILTER m.step == @step RETURN m";
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var VertexMessageQueue = function(parent, vertexInfo) {
  this._parent = parent;
  this._vertexInfo = vertexInfo;
  this._inc = [];
  this._pos = 0;
};

VertexMessageQueue.prototype.count = function () {
  return this._inc.length;
};

VertexMessageQueue.prototype.hasNext = function () {
  return this._pos < this.count();
};

VertexMessageQueue.prototype.next = function () {
  if (!this.hasNext()) {
    return null;
  }
  var next = this._inc[this._pos];
  this._pos++;
  return next;
};

VertexMessageQueue.prototype._fill = function (msg) {
  if (msg.aggregate) {
    this._inc.push({data: msg.aggregate});
  }
  if (msg.plain) {
    this._inc = this._inc.concat(msg.plain);
  }
};

VertexMessageQueue.prototype._clear = function () {
  this._inc = [];
  this._pos = 0;
};

VertexMessageQueue.prototype.sendTo = function (target, data, sendLocation) {
  if (sendLocation !== false) {
    sendLocation = true; 
  }
  if (target && typeof target === "string" && target.match(/\S+\/\S+/)) {
    target = pregel.getLocationObject(this.__executionNumber, target);
  } else if (!(
    target && typeof target === "object" &&
                                target._id && target.shard
  )) {
    var err = new ArangoError();
    err.errorNum = ERRORS.ERROR_PREGEL_NO_TARGET_PROVIDED.code;
    err.errorMessage = ERRORS.ERROR_PREGEL_NO_TARGET_PROVIDED.message;
    throw err;
  }
  var toSend = {
    data: data
  };
  if (sendLocation) {
    toSend.sender = this._vertexInfo;
  }
  this._parent._send(target, toSend);
};

// End of Vertex Message queue

var Queue = function (executionNumber, vertices, aggregate) {
  var self = this;
  this.__vertices = vertices;
  this.__executionNumber = executionNumber;
  this.__collection = pregel.getMsgCollection(executionNumber);
  this.__workCollection = pregel.getWorkCollection(executionNumber);
  this.__workCollectionName = this.__workCollection.name();
  this.__step = 0;
  if (aggregate) {
    this.__aggregate = aggregate;
  }
  this.__queues = [];
  _.each(vertices, function(v, k) {
    if (k === "__actives") {
      return;
    }
    var id = v._locationInfo._id;
    self.__queues.push(id);
    self[id] = new VertexMessageQueue(self, v._locationInfo);
  });
  this.__output = {};
};

Queue.prototype._fillQueues = function () {
  var self = this;
  _.each(this.__queues, function(q) {
    self[q]._clear();
  });
  _.each(this.__output, function(ignore, shard) {
    delete self.__output[shard];
  });
  var cursor = db._query(query, {
    "@collection": this.__workCollectionName,
    step: this.__step
  });
  var msg, vQueue;
  this.__step++;
  var fillQueue = function (content, key) {
    if (key === "_key" || key === "_id" || key === "_rev"
      || key === "toShard" || key === "step") {
      return;
    }
    vQueue = self[key];
    if (vQueue) {
      vQueue._fill(content);
      if (self.__vertices[key]) {
        self.__vertices[key]._activate();
      } else {
        self.__queues.splice(this.__queues.indexOf(key), 1);
        delete self[key];
      }
    }
  };
  while (cursor.hasNext()) {
    msg = cursor.next();
    _.each(msg, fillQueue);
  }
};

//msg has data and optionally sender
Queue.prototype._send = function (target, msg) {
  var out = this.__output;
  var shard = target.shard;
  var id = target._id;
  out[shard] = out[shard] || {};
  out[shard][id] = out[shard][id] || {};
  var msgContainer = out[shard][id];
  if (msg.sender || !this.__aggregate) {
    msgContainer.plain = msgContainer.plain || [];
    msgContainer.plain.push(msg);
  } else {
    if (msgContainer.hasOwnProperty("aggregate")) {
      msgContainer.aggregate = this.__aggregate(msg.data, msgContainer.aggregate);
    } else {
      msgContainer.aggregate = msg.data;
    }
  }
};

Queue.prototype._storeInCollection = function() {
  var self = this;
  _.each(this.__output, function(doc, shard) {
    doc.toShard = shard;
    doc.step = self.__step;
    self.__collection.save(doc);
  });
};

exports.MessageQueue = Queue;
