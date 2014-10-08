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



// Internal Vertex Array Structure: [_key, shard, result, active, deleted, ..edges..]

var KEY = 0;
var SHARD = 1;
var RESULT = 2;
var ACTIVE = 3;
var DELETED = 4;

var p = require("org/arangodb/profiler");

var internal = require("internal");
var db = require("internal").db;
var pregel = require("org/arangodb/pregel");

var Vertex = function (parent, list, edgeCursor) {
  this.__parent = parent;
  this.__list = list;
  this._outEdges = edgeCursor;
};

Vertex.prototype._loadVertex = function (id) {
  this.__id = id;
  this.__current = this.__list[id];
  this._key = this.__current[KEY];
  this._outEdges.loadEdges(this.__current);
};

Vertex.prototype._get = function (attr) {
  return this.__parent.readValue(this.__current[SHARD], this.__current[KEY], attr);
};

Vertex.prototype._getLocationInfo = function () {
  return [this.__current[KEY], this.__current[SHARD]];
};

Vertex.prototype._deactivate = function () {
  if (this.__current[ACTIVE]) {
    this.__current[ACTIVE] = false;
    this.__parent.decrActives();
  }
};

Vertex.prototype._activate = function () {
  if (this.__current[DELETED] || this.__current[ACTIVE]) {
    return;
  }
  this.__current[ACTIVE] = true;
  this.__parent.incrActives();
};

Vertex.prototype._isActive = function () {
  return !this.__current[DELETED] && this.__current[ACTIVE];
};

Vertex.prototype._isDeleted = function () {
  return this.__current[DELETED];
};

Vertex.prototype._delete = function () {
  if (this.__current[ACTIVE]) {
    this.__parent.decrActives();
  }
  this.__current[DELETED] = true;
};

Vertex.prototype._getResult = function () {
  return this.__current[RESULT];
};

Vertex.prototype._setResult = function (result) {
  this.__current[RESULT] = result;
};

Vertex.prototype.getShard = function () {
  return this.__parent.shardMapping[this.__current[SHARD]];
};


var VertexList = function (mapping) {
  this.edgeCursor = new pregel.EdgeIterator(this);
  this.mapping = mapping;
  this.current = -1;
  this.length = 0;
  this.actives = 0;
  this.shardMapping = [];
  this.edgeShardMapping = [];
  this.list = [];
  this.vertex = new Vertex(this, this.list, this.edgeCursor);
};

// Shard == Name of the collection
// sourceList == shard.NTH() content of documents
VertexList.prototype.addShardContent = function (shard, collection, keys) {
  var index, i, j, e, out, doc, vertexInfo, eShardId;
  var l = keys.length;
  var shardId = this.shardMapping.length;
  Array.prototype.push.apply(this.shardMapping, [shard, collection]);
  var respEdgeShards = this.mapping.getResponsibleEdgeShards(shard);
  for (i = 0; i < respEdgeShards.length; ++i) {
    eShardId = this.edgeShardMapping.indexOf(respEdgeShards[i]);
    if (eShardId === -1) {
      eShardId = this.edgeShardMapping.length;
      this.edgeShardMapping.push(respEdgeShards[i]);
    }
    respEdgeShards[i] = eShardId;
  }
  for (index = 0; index < l; ++index) {
    // Vertex Info: [_key, shard, result, active, deleted, ..edges..]
    vertexInfo = [keys[index], shardId, undefined, true, false];
    this.list.push(vertexInfo);
    doc = collection + "/" + keys[index];
    for (i = 0; i < respEdgeShards.length; ++i) {
      eShardId = respEdgeShards[i];
      // TODO Ask Frank for direct Index Access
      out = db[this.edgeShardMapping[eShardId]].outEdges(doc);
      for (j = 0; j < out.length; ++j) {
        e = out[j];
        var toKey = e._to.split("/")[1];
    // Edge Info: [.. _key, shard, to, shardKey, result, deleted ..]
        Array.prototype.push.apply(vertexInfo, [
          e._key,
          eShardId,
          toKey,
          this.edgeShardMapping.getToShardKey(toKey, collection),
          undefined,
          false
        ]);
      }
    }
  }
  this.actives += l;
  this.length += l;
};

VertexList.prototype.reset = function () {
  this.current = -1;
};

VertexList.prototype.hasNext = function () {
  return this.current < this.length - 1;
};

VertexList.prototype.next = function () {
  if(this.hasNext()) {
    this.current++;
    this.vertex._loadVertex(this.current);
    return this.vertex;
  }
  return null;
};

VertexList.prototype.readValue = function (shard, key, attr) {
  return db[this.shardMapping[shard]].document(key)[attr];
};

VertexList.prototype.readEdgeValue = function (shard, key, attr) {
  return db[this.edgeShardMapping[shard]].document(key)[attr];
};

VertexList.prototype.decrActives = function () {
  this.actives--;
};

VertexList.prototype.incrActives = function () {
  this.actives++;
};

VertexList.prototype.countActives = function () {
  return this.actives;
};

VertexList.prototype.saveAll = function () {
  var resultShards =  [];
  var i, v;
  for (i = 0; i < this.shardMapping.length; i += 2) {
    resultShards.push(db[this.mapping.getResultShard(this.shardMapping[i])]);
    resultShards.push(this.mapping.getResultCollection(this.shardMapping[i+1]));
  }
  for (i = 0; i < this.length; ++i) {
    v = this.list[i];
    resultShards[v[SHARD]].save({
      _key: v[KEY],
      _deleted: v[DELETED],
      result: v[RESULT]
    });
    //TODO Save Edges
  }
  return;
};

VertexList.prototype.getShardName = function (shardId) {
  return this.shardMapping[shardId];
};

exports.Vertex = Vertex;
exports.VertexList = VertexList;
