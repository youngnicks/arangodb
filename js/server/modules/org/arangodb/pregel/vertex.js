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

var Vertex = function (vertexList, resultList) {
  this.__vertexList = vertexList;
  this.__resultList = resultList;
};

Vertex.prototype._loadVertex = function (shard, id, outEdges, _key) {
  this.shard = shard;
  this.id = id;
  this._key = _key;
  this._outEdges = outEdges;
};

Vertex.prototype._get = function (attr) {
  return this.__vertexList.readValue(this.shard, this.id, attr);
};

Vertex.prototype._getLocationInfo = function () {
  return this.__vertexList.getLocationInfo(this.shard, this.id);
};

Vertex.prototype._deactivate = function () {
  if (this._isActive()) {
    this.__vertexList.decrActives();
  }
  this.__resultList[this.shard][this.id].a = false;
};

Vertex.prototype._activate = function () {
  if (this._isDeleted()) {
    return;
  }
  if (!this._isActive()) {
    this.__vertexList.incrActives();
  }
  this.__resultList[this.shard][this.id].a = true;
};

Vertex.prototype._isActive = function () {
  if (!this._isDeleted()) {
    if (this.__resultList[this.shard][this.id].hasOwnProperty("a")) {
      return this.__resultList[this.shard][this.id].a;
    }
    return true;
  }
  return false;
};

Vertex.prototype._isDeleted = function () {
  return this.__resultList[this.shard][this.id].d || false;
};

Vertex.prototype._delete = function () {
  if (this._isActive()) {
    this.__vertexList.decrActives();
  }
  this.__resultList[this.shard][this.id].d = true;
  this._save();
  delete this.__vertexList[this.shard][this.id];
};

Vertex.prototype._getResult = function () {
  return this.__resultList[this.shard][this.id].r || {};
};

Vertex.prototype._setResult = function (result) {
  this.__resultList[this.shard][this.id].r = result;
};

Vertex.prototype._save = function () {
  this.__vertexList.save(this.shard, this.id, this._getResult(), this._isDeleted());
};

exports.Vertex = Vertex;

var VertexList = function (mapping) {
  this.edgeList = new pregel.EdgeList(mapping);
  this.mapping = mapping;
  this.current = -1;
  this.actives = 0;
  this.shardMapping = [];
  this.sublist = [];
  this.sourceList = [this.sublist];

  /*
  this.sourceList = [];
  */

  this.resultSubList = [];
  this.resultList = [this.resultSubList];
  this.resultShards = [];
  this.shard = 0;
  this.vertex = new Vertex(this, this.resultList);
};

// Shard == Name of the collection
// sourceList == shard.NTH() content of documents
VertexList.prototype.addShardContent = function (shard, collection, sourceList) {
  var l = sourceList.length;
  var shardId = this.shardMapping.length;
  this.shardMapping.push({
    shard: db[shard],
    collection: collection,
    length: l
  });
  this.sublist.push(sourceList);
  var respEdges = this.mapping.getResponsibleEdgeShards(shard);
  var shardResult = [];
  this.edgeList.addShard();
  var index, i, out, doc;
  for (index = 0; index < l; ++index) {
    this.edgeList.addVertex(shardId);
    shardResult.push({
      locationInfo: {
        _key: sourceList[index],
        shard: shard
      }
    });
    doc = collection + "/" + sourceList[index];
    for (i = 0; i < respEdges.length; ++i) {
      out = db[respEdges[i]].outEdges(doc);
      this.edgeList.addShardContent(shardId, respEdges[i], index, out);
    }
  }
  this.resultSubList.push(shardResult);
  this.resultShards.push(db[this.mapping.getResultShard(shard)]);
  this.actives += l;
  if (this.sublist.length === 1000) {
    this.sublist = [];
    this.sourceList.push(this.sublist);
    this.edgeList.addSublist();
    this.resultSubList = [];
    this.resultList.push(this.resultSubList);
  }
};

VertexList.prototype.flattenList = function () {
  var empty = [];
  this.sourceList = empty.concat.apply(empty, this.sourceList);
  this.resultList = empty.concat.apply(empty, this.resultList);
  require("console").log(this.resultList);
  this.edgeList.flattenList();
};

VertexList.prototype.reset = function () {
  this.shard = 0;
  this.current = -1;
  this.currentLength = this.shardMapping[this.shard].length;
};

VertexList.prototype.hasNext = function () {
  if (this.current < this.currentLength - 1) {
    return true;
  }
  if (this.shard >= this.shardMapping.length - 1) {
    return false;
  }
  var i;
  for (i = this.shard + 1; i < this.shardMapping.length; ++i) {
    if (this.shardMapping[i].length > 0) {
      return true;
    }
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
    this.vertex._loadVertex(this.shard, this.current,
      this.edgeList.loadEdges(this.shard, this.current),
      this.sourceList[this.shard][this.current]
    );
    return this.vertex;
  }
  return null;
};

VertexList.prototype.readValue = function (shard, id, attr) {
  var x = this.sourceList[shard][id];
  return this.shardMapping[shard].shard.document(x)[attr];
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

VertexList.prototype.getLocationInfo = function (shard, id) {
  return this.resultList[shard][id].locationInfo;
};

VertexList.prototype.getShardName = function (shardId) {
  return this.shardMapping[shardId].shard.name();
};
exports.VertexList = VertexList;
