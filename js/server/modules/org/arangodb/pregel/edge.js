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

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var _ = require("underscore");

var Edge = function (edgeJSON, resultShard, from, to, targetVertex) {
  var t = p.stopWatch();
  this._doc = edgeJSON;

  this.__resultShard = resultShard;
  this.__result = {};
  this.__deleted = false;
  this.__from = from;
  this.__to = to;
  this._targetVertex = targetVertex;
  p.storeWatch("ConstructEdge", t);
};

Edge.prototype._delete = function () {
  this.__deleted = true;
};

Edge.prototype._isDeleted = function () {
  return this.__deleted;
};

Edge.prototype._getResult = function () {
  return this.__result;
};

Edge.prototype._setResult = function (result) {
  this.__result = result;
};

Edge.prototype._save = function () {
  var t = p.stopWatch();
  this.__resultShard.save(this.__from, this.__to, {
    _key: this._doc._key,
    result: this._getResult(),
    deleted: this._isDeleted()
  });
  p.storeWatch("SaveEdge", t);
};

exports.Edge = Edge;

var EdgeList = function (mapping) {
  this.mapping = mapping;
  this.sourceList = [];
};

EdgeList.prototype.addShard = function () {
  this.sourceList.push([]);
};

EdgeList.prototype.addVertex = function (shard) {
  this.sourceList[shard].push([]);
};

EdgeList.prototype.addShardContent = function (shard, edgeShard, vertex, edges) {
  var mapping = this.mapping;
  var self = this;
  var resultShard = db[mapping.getResultShard(edgeShard)];
  _.each(edges, function(e) {
    var fromSplit = e._from.split("/");
    var from = mapping.getResultCollection(fromSplit[0]) + "/" + fromSplit[1]; 
    var toSplit = e._to.split("/");
    var to = mapping.getResultCollection(toSplit[0]) + "/" + toSplit[1]; 
    var targetVertex = mapping.getToLocationObject(e, toSplit[0]);
    self.sourceList[shard][vertex].push(new Edge(e, resultShard, from, to, targetVertex));
  });
};

EdgeList.prototype.save = function (shard, id) {
  _.each(this.sourceList[shard][id], function(e) { e._save();});
};

EdgeList.prototype.loadEdges = function (shard, id) {
  return this.sourceList[shard][id];
}

exports.EdgeList = EdgeList;
