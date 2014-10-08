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


var KEY = 0;
var SHARD = 1;
var TARGET = 2;
var RESULT = 3;
var DELETED = 4;
var EDGESTART = 5;
var EDGEOFFSET = 5;

var p = require("org/arangodb/profiler");

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");

var Edge = function (parent) {
  this.__parent = parent;
  this.__position = -1;
};

Edge.prototype._get = function (attr) {
  return this.__parent.getValue(attr);
};

Edge.prototype._delete = function () {
  this.__parent.info[this.__position + DELETED] = true;
};

Edge.prototype._isDeleted = function () {
  return this.__parent.info[this.__position + DELETED];
};

Edge.prototype._getResult = function () {
  return this.__parent.info[this.__position + RESULT];
};

Edge.prototype._setResult = function (result) {
  this.__parent.info[this.__position + RESULT] = result;
};

/*
Edge.prototype._save = function (from, to) {
  var obj = {
    _key: this.__edgeInfo.key,
    result: this._getResult(),
    _deleted: this._isDeleted()
  };
  this.__edgeInfo.rs.save(from, to, obj);
};
*/

Edge.prototype._getTarget = function () {
  return this.__parent.info[this.__position + TARGET];
};

Edge.prototype._loadEdge = function (startPos) {
  this.__position = startPos;
};

exports.Edge = Edge;

var EdgeIterator = function (parent) {
  this.parent = parent;
  this.current = 0;
  this.edge = new Edge(this);
};

EdgeIterator.prototype.hasNext = function () {
  return this.current < this.length - 1;
};

EdgeIterator.prototype.next = function () {
  if (this.hasNext()) {
    this.current++;
    this.edge._loadEdge(this.current * EDGEOFFSET + EDGESTART);
    return this.edge;
  }
  return undefined;
};

EdgeIterator.prototype.count = function () {
  return this.length;
};

EdgeIterator.prototype.loadEdges = function (vertex) {
  this.info = vertex;
  this.current = -1;
  this.length = (this.info.length - EDGESTART) / EDGEOFFSET;
};

EdgeIterator.prototype.getValue = function (attr) {
  throw "Sorry not yet";
  return this.parent.getValue(this.current, attr);
};

exports.EdgeIterator = EdgeIterator;

/*
EdgeList.prototype.save = function (shard, id) {
  var list = this.sourceList[shard][id];
  var mapping = this.mapping;
  var edge = this.iterator.edge;
  if (list.length > 0) {
    var edgeShard = list[0].s;
    var key = list[0].key;
    var doc = db[edgeShard].document(key);
    var fromSplit = doc._from.split("/");
    var from = mapping.getResultCollection(fromSplit[0]) + "/" + fromSplit[1]; 
    var index, e, toSplit, to;
    for (index = 0; index < list.length; index++) {
      e = list[index];
      this.iterator.current = index;
      edgeShard = e.s;
      key = e.key;
      doc = db[edgeShard].document(key);
      toSplit = doc._to.split("/");
      to = mapping.getResultCollection(toSplit[0]) + "/" + toSplit[1]; 
      edge._loadEdge(e);
      edge._save(from, to);
    }
  }
};

EdgeList.prototype.getValue = function (index, attr) {
  var list = this.sourceList[this.shard][this.id];
  var edgeShard = list[index].s;
  var key = list[index].key;
  return db[edgeShard].document(key)[attr];
};
*/
