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

var Vertex = function (vertexList, resultList) {
  this.__vertexList = vertexList;
  this.__resultList = resultList;
};

Vertex.prototype._loadVertex = function (shard, id, outEdges) {
  this.shard = shard;
  this.id = id;
  this._outEdges = outEdges;
};

Vertex.prototype._get = function (attr) {
  var res = this.__vertexList.readValue(this.shard, this.id, attr);
  return res;
};

Vertex.prototype._deactivate = function () {
  if (this._isActive()) {
    this.__vertexList.decrActives();
  }
  this.__resultList[this.shard][this.id].active = false;
};

Vertex.prototype._activate = function () {
  if (this._isDeleted()) {
    return;
  }
  if (!this._isActive()) {
    this.__vertexList.incrActives();
  }
  this.__resultList[this.shard][this.id].active = true;
};

Vertex.prototype._isActive = function () {
  return this.__resultList[this.shard][this.id].active && !this._isDeleted();
};

Vertex.prototype._isDeleted = function () {
  return this.__resultList[this.shard][this.id].deleted;
};

Vertex.prototype._delete = function () {
  if (this._isActive()) {
    this.__vertexList.decrActives();
  }
  this.__resultList[this.shard][this.id].deleted = true;
  this._save();
  delete this.__vertexList[this.shard][this.id];
};

Vertex.prototype._getResult = function () {
  return this.__resultList[this.shard][this.id].result;
};

Vertex.prototype._setResult = function (result) {
  this.__resultList[this.shard][this.id].result = result;
};

Vertex.prototype._save = function () {
  var t = p.stopWatch();
  this.__vertexList.save(this.shard, this.id, this._getResult(), this._isDeleted());
  p.storeWatch("SaveVertex", t);
};

exports.Vertex = Vertex;

var VertexList = function (mapping) {
  this.edgeList = new pregel.EdgeList(mapping);
  this.mapping = mapping;
  this.current = -1;
  this.actives = 0;
  this.shardMapping = [];
  this.sourceList = [];
  this.resultList = [];
  this.resultShards = [];
  this.shard = 0;
  this.vertex = new Vertex(this, this.resultList);
};

// Shard == Name of the collection
// sourceList == shard.NTH() content of documents
VertexList.prototype.addShardContent = function (shard, sourceList) {
  var l = sourceList.length;
  var shardId = this.shardMapping.length;
  this.shardMapping.push({
    shard: shard,
    length: l
  });
  this.sourceList.push(sourceList);
  var respEdges = this.mapping.getResponsibleEdgeShards(shard);
  var shardResult = [];
  var self = this;
  this.edgeList.addShard();
  _.each(sourceList, function(doc, index) {
    self.edgeList.addVertex(shardId);
    shardResult.push({
      active: true,
      deleted: false,
      result: {},
      locationInfo: {
        _id: doc._id,
        shard: shard
      }
    });
    _.each(respEdges, function(edgeShard) {
      self.edgeList.addShardContent(shardId, edgeShard, index, db[edgeShard].outEdges(doc._id));
    });
  });
  this.resultList.push(shardResult);
  this.resultShards.push(db[this.mapping.getResultShard(shard)]);
  this.actives += l;
};

VertexList.prototype.reset = function () {
  this.shard = 0;
  this.current = -1;
  this.currentLength = this.shardMapping[this.shard].length;
};

VertexList.prototype.hasNext = function () {
  if (this.shard < this.shardMapping.length - 1) {
    return true;
  }
  if (this.current < this.currentLength - 1) {
    return true;
  }
  return false;
};

VertexList.prototype.next = function () {
  if(this.hasNext()) {
    this.current++;
    if (this.current === this.currentLength) {
      this.current = 0;
      this.shard++;
      this.currentLength = this.shardMapping[this.shard].length;
    }
    this.vertex._loadVertex(this.shard, this.current, this.edgeList.loadEdges(this.shard, this.current));
    return this.vertex;
  }
  return null;
};

VertexList.prototype.readValue = function (shard, id, attr) {
  return this.sourceList[shard][id][attr];
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

VertexList.prototype.save = function (shard, id, result, deleted) {
  this.edgeList.save(shard, id);
  this.resultShards[shard].save({
    _key: this.readValue(shard, id, "_key"),
    _deleted: deleted,
    result: result
  });
};

exports.VertexList = VertexList;
