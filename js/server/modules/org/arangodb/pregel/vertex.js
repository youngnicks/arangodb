/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports*/

////////////////////////////////////////////////////////////////////////////////
/// @brief Pregel wrapper for vertices. Will add content of the vertex and all 
///   functions allowed within a pregel execution step.
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
/// @author Florian Bartels, Michael Hackstein, Heiko Kernbach
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var _ = require("underscore");

var Vertex = function (executionNumber, vertexInfo) {
  var vertexId = vertexInfo._id;
  var resultShard = vertexInfo.shard;
  var self = this;
  this._executionNumber = executionNumber;

  //get attributes from original collection
  var collection = pregel.getResponsibleShardFromMapping(executionNumber, resultShard);
  var data = db[collection].document(vertexId.split("/")[1]);

  //write attributes to vertex
  _.each(data, function(val, key) {
    self[key] = val;
  });
  this._resCol = db._collection(resultShard);

  this._result = this._resCol.document(this._key).result;

  var Edge = require("org/arangodb/pregel").Edge;
  var respEdges = pregel.getResponsibleEdgeShards(this._executionNumber, this);
  this._outEdges = [];
  _.each(respEdges, function(collection) {
    var outEdges = db[collection].outEdges(self._id);
    _.each(outEdges, function (json) {
      var e = new Edge(self._executionNumber, json);
      self._outEdges.push(e);
    });
  });

};

Vertex.prototype._deactivate = function () {
  this._resCol.update(this._key, {active: false});
};

Vertex.prototype._delete = function () {
  this._resCol.update(this._key, {deleted: true});
};

Vertex.prototype._save = function () {
  this._resCol.update(this._key, {result: this._result});
};

exports.Vertex = Vertex;
