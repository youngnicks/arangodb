/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global exports*/

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
var SHARDKEY = 3;
var RESULT = 4;
var DELETED = 5;
var EDGESTART = 5;
var EDGEOFFSET = 6;

var Edge = function (parent) {
  'use strict';
  this.__parent = parent;
  this.__position = -1;
};

Edge.prototype._get = function (attr) {
  'use strict';
  // Optimize _id, _key, _from, _to
  return this.__parent.getValue(
    this.__parent.info[this.__position + SHARD],
    this.__parent.info[this.__position + KEY],
    attr
  );
};

Edge.prototype._delete = function () {
  'use strict';
  this.__parent.info[this.__position + DELETED] = true;
};

Edge.prototype._isDeleted = function () {
  'use strict';
  return this.__parent.info[this.__position + DELETED];
};

Edge.prototype._getResult = function () {
  'use strict';
  return this.__parent.info[this.__position + RESULT];
};

Edge.prototype._setResult = function (result) {
  'use strict';
  this.__parent.info[this.__position + RESULT] = result;
};

Edge.prototype._getShardKey = function () {
  'use strict';
  return this.__parent.info[this.__position + SHARDKEY];
};

Edge.prototype._setShardKey = function (shardKey) {
  'use strict';
  this.__parent.info[this.__position + SHARDKEY] = shardKey;
};

Edge.prototype._getTarget = function () {
  'use strict';
  var target = this.__parent.info[this.__position + TARGET];
  var shardKey = this.__parent.info[this.__position + SHARDKEY];
  return [target, shardKey];
};

Edge.prototype._loadEdge = function (startPos) {
  'use strict';
  this.__position = startPos;
};

exports.Edge = Edge;

var EdgeIterator = function (parent) {
  'use strict';
  this.parent = parent;
  this.current = 0;
  this.edge = new Edge(this);
};

EdgeIterator.prototype.hasNext = function () {
  'use strict';
  return this.current < this.length - 1;
};

EdgeIterator.prototype.next = function () {
  'use strict';
  if (this.hasNext()) {
    this.current++;
    this.edge._loadEdge(this.current * EDGEOFFSET + EDGESTART);
    return this.edge;
  }
  return undefined;
};

EdgeIterator.prototype.count = function () {
  'use strict';
  return this.length;
};

EdgeIterator.prototype.resetCursor = function () {
  'use strict';
  this.current = -1;
};

EdgeIterator.prototype.loadEdges = function (vertex) {
  'use strict';
  this.info = vertex;
  this.current = -1;
  this.length = (this.info.length - EDGESTART) / EDGEOFFSET;
};

EdgeIterator.prototype.getValue = function (shard, key, attr) {
  'use strict';
  return this.parent.readEdgeValue(shard, key, attr);
};

exports.EdgeIterator = EdgeIterator;
