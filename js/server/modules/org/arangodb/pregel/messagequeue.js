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
var query = "FOR m IN @@collection FILTER m._to == @vertex && m.step == @step RETURN m.data";

var Queue = function (executionNumber, vertexId, step) {
  this.__collection = pregel.getMsgCollection(executionNumber);
  this.__from = vertexId;
  this.__nextStep = step + 1;
  this.__step = step;
};

Queue.prototype.sendTo = function(target, data) {
  this.__collection.save(this.__from, target, {data: data, step: this.__nextStep});
};

Queue.prototype.getMessages = function () {
  return db._createStatement({
    query: query,
    bindVars: {
      step: this.__step,
      vertex: this.__from,
      "@collection": this.__collection.name()
    },
    count: true
  }).execute();
};

exports.MessageQueue = Queue;
