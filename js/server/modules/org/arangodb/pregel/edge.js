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

var Edge = function (edgeJSON, mapping, shard) {
  var t = p.stopWatch();
  this._doc = edgeJSON;

  this.__resultShard = db[mapping.getResultShard(shard)];
  this.__result = {};
  this.__deleted = false;
  var fromSplit = this._doc._from.split("/");
  this.__from = mapping.getResultCollection(fromSplit[0]) + "/" + fromSplit[1]; 
  var toSplit = this._doc._to.split("/");
  this.__to = mapping.getResultCollection(toSplit[0]) + "/" + toSplit[1]; 
  this._targetVertex = mapping.getToLocationObject(this, toSplit[0]);
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
    result: this.__result,
    deleted: this.__deleted
  },
  { 
    silent: true
  });
  p.storeWatch("SaveEdge", t);
};

exports.Edge = Edge;
