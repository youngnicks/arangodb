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
var pregel = require("org/arangodb/pregel");
var query = "FOR m IN @@collection FILTER m._toVertex == @vertex && m.step == @step RETURN m";
var countQuery = "FOR m IN @@collection FILTER m._toVertex == @vertex && m.step == @step RETURN LENGTH(m.data)";
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var InMessages = function (col, step, from) {
  var bindVars = {
    step: step,
    vertex: from,
    "@collection": col
  };
  var countQ = db._query(
    countQuery, bindVars
  );
  var c = 0;
  while (countQ.hasNext()) {
    c += countQ.next();
  }
  this._count = c;
  this._position = 0;
  this._maxPosition = 0;
  this._cursor = db._query(query, bindVars); 
  this._current = null;
};

InMessages.prototype.count = function () {
  return this._count;
};

InMessages.prototype.hasNext = function () {
  if (this._position < this._maxPosition) {
    return true;
  }
  if (this._cursor.hasNext()) {
    this._current = this._cursor.next();
    this._position = -1;
    this._maxPosition = this._current.data.length - 1;
    return true;
  }
  return false;
};

InMessages.prototype.next = function () {
  if (!this.hasNext()) {
    return null;
  }
  this._position++;
  if (this._current.sender) {
    return {
      data: this._current.data[this._position],
      sender: this._current.sender[this._position]
    };
  }
  return {
    data: this._current.data[this._position]
  };
};

var Queue = function (executionNumber, vertexInfo, step, storeAggregate) {
  this.__executionNumber = executionNumber;
  this.__collection = pregel.getMsgCollection(executionNumber);
  this.__workCollection = pregel.getWorkCollection(executionNumber);
  this.__from = vertexInfo.locationObject._id;
  this.__nextStep = step + 1;
  this.__step = step;
  this.__vertexInfo = vertexInfo.locationObject;
  this.__storeAggregate = storeAggregate;
};

// Target is id now, has to be modified to contian vertex data
Queue.prototype.sendTo = function(target, data, sendLocation) {
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
    toSend.sender = this.__vertexInfo;
  }
  this.__storeAggregate(this.__nextStep, target, toSend);
};

Queue.prototype.getMessages = function () {
  return new InMessages(this.__workCollection.name(), this.__step, this.__from);
};

exports.MessageQueue = Queue;
