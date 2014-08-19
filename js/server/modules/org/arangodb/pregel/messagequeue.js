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
var arangodb = require("org/arangodb");
var ERRORS = arangodb.errors;
var ArangoError = arangodb.ArangoError;

var Queue = function (executionNumber, vertexInfo, step) {
  var vertexId = vertexInfo._id;
  this.__executionNumber = executionNumber;
  this.__collection = pregel.getMsgCollection(executionNumber);
  this.__workCollection = pregel.getWorkCollection(executionNumber);
  var vertexCollectionName = pregel.getOriginalCollection(vertexId, executionNumber);
  var key = vertexId.split("/")[1];
  this.__from = vertexCollectionName + "/" + key;
  this.__nextStep = step + 1;
  this.__step = step;
  this.__vertexInfo = vertexInfo;
  this.__vertexInfo._key = key;
  this.__vertexInfo._id = this.__from;
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
    _toVertex: target._id,
    data: data,
    step: this.__nextStep,
    toShard: target.shard
  };
  if (sendLocation) {
    toSend.sender = pregel.getLocationObject(this.__executionNumber, this.__vertexInfo);
  }
  this.__collection.save(this.__vertexInfo._id, target._id, toSend);
};

Queue.prototype.getMessages = function () {
  return db._query(
    query,
    {
      step: this.__step,
      vertex: this.__from,
      "@collection": this.__workCollection.name()
    },{
      count: true
    }
  );
};

exports.MessageQueue = Queue;
