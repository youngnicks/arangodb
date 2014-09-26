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

var Edge = function () {
  this.__edgeInfo = {};
};

Edge.prototype._get = function (attr) {
  return this.__edgeInfo.doc[attr];
};

Edge.prototype._delete = function () {
  this.__edgeInfo.deleted = true;
};

Edge.prototype._isDeleted = function () {
  return this.__edgeInfo.deleted || false;
};

Edge.prototype._getResult = function () {
  return this.__edgeInfo.result;
};

Edge.prototype._setResult = function (result) {
  this.__edgeInfo.result = result;
};

Edge.prototype._save = function (from, to) {
  var t = p.stopWatch();
  this.__edgeInfo.resShard.save(from, to, {
    _key: this._get("_key"),
    result: this._getResult(),
    deleted: this._isDeleted()
  });
  p.storeWatch("SaveEdge", t);
};

Edge.prototype._getTarget = function () {
  return this.__edgeInfo.target;
};

Edge.prototype._loadEdge = function (edgeInfo) {
  this.__edgeInfo = edgeInfo;
};

exports.Edge = Edge;

var EdgeIterator = function () {
  this.length = 0;
  this.current = -1;
  this.list = [];
  this.edge = new Edge();
};

EdgeIterator.prototype.hasNext = function () {
  return this.current < this.length - 1;
};

EdgeIterator.prototype.next = function () {
  if (this.hasNext()) {
    this.current++;
  }
  this.edge._loadEdge(this.list[this.current]);
  return this.edge;
};

EdgeIterator.prototype.count = function () {
  return this.length;
};

EdgeIterator.prototype.loadEdges = function (edgeArray) {
  this.list = edgeArray;
  this.current = -1;
  this.length = edgeArray.length;
};

var EdgeList = function (mapping) {
  this.mapping = mapping;
  this.iterator = new EdgeIterator();
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
    var toSplit = e._to.split("/");
    var edgeInfo = {
      doc: e,
      target: mapping.getToLocationObject(e, toSplit[0]),
      resShard: resultShard,
      result: {}
    };
    self.sourceList[shard][vertex].push(edgeInfo);
  });
};

EdgeList.prototype.save = function (shard, id) {
  var list = this.sourceList[shard][id];
  var mapping = this.mapping;
  var edge = this.iterator.edge;
  if (list.length > 0) {
    var fromSplit = list[0].doc._from.split("/");
    var from = mapping.getResultCollection(fromSplit[0]) + "/" + fromSplit[1]; 
    _.each(list, function(e) {
      var toSplit = e.doc._to.split("/");
      var to = mapping.getResultCollection(toSplit[0]) + "/" + toSplit[1]; 
      edge._loadEdge(e);
      edge._save(from, to);
    });
  }
};

EdgeList.prototype.loadEdges = function (shard, id) {
  this.iterator.loadEdges(this.sourceList[shard][id]);
  return this.iterator;
};

exports.EdgeList = EdgeList;
