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
var p = require("org/arangodb/profiler");

var internal = require("internal");
var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var _ = require("underscore");

var Vertex = function (mapping, vertexInfo) {
  var t = p.stopWatch();
  var Edge = pregel.Edge;
  var vertexId = vertexInfo._id;
  var resultShard = vertexInfo.shard;
  var self = this;

  //get attributes from original collection
  this._locationInfo = vertexInfo.locationObject;
  var collection = this._locationInfo.shard;
  var data = db[collection].document(vertexId.split("/")[1]);

  //write attributes to vertex
  _.each(data, function(val, key) {
    self[key] = val;
  });
  this._resCol = db._collection(resultShard);
  this.__hasChanged = false;
  this._doc = vertexInfo._doc;

  this._result = this._doc.result;

  var respEdges = mapping.getResponsibleEdgeShards(collection);
  this._outEdges = [];
  _.each(respEdges, function(edgeShard) {
    var outEdges = db[edgeShard].outEdges(self._id);
    _.each(outEdges, function (json) {
      var e = new Edge(mapping, json, edgeShard);
      self._outEdges.push(e);
    });
  });
  p.storeWatch("ConstructVertex", t);
};

Vertex.prototype._deactivate = function () {
  this._doc.active = false;
  this.__hasChanged = true;
};

Vertex.prototype._delete = function () {
  this._doc.deleted = true;
  this.__hasChanged = true;
};

Vertex.prototype._getResult = function () {
  return this._result;
};

Vertex.prototype._setResult = function (result) {
  this.__hasChanged = true;
  this._result = result;
};

Vertex.prototype._save = function () {
  var t = p.stopWatch();
  this._outEdges.forEach(function(e) {
    e._save();
  });
  if (this.__hasChanged) {
    this._doc.result = this._result;
    this._resCol.replace(this._key, this._doc);
  }
  p.storeWatch("SaveVertex", t);
};

exports.Vertex = Vertex;
