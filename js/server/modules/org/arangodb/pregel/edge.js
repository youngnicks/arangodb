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

var Edge = function (mapping, edgeJSON, shard) {
  var t = p.stopWatch();
  var self = this;
  _.each(edgeJSON, function(v, k) {
    self[k] = v;
  });
  this._resultShard = db._collection(mapping.getEdgeResultShard(shard));
  this._doc = this._resultShard.document(this._key);
  delete this._doc._PRINT;
  this.__hasChanged = false;
  this._result = this._doc.result;
  this._targetVertex = mapping.getToLocationObject(this);
  p.storeWatch("ConstructEdge", t);
};

Edge.prototype._delete = function () {
  this._doc.deleted = true;
  this.__hasChanged = true;
};

Edge.prototype._isDeleted = function () {
  return this._doc.deleted;
};

Edge.prototype._getResult = function () {
  return this._result;
};

Edge.prototype._setResult = function (result) {
  this.__hasChanged = true;
  this._result = result;
};

Edge.prototype._save = function () {
  var t = p.stopWatch();
  if (this.__hasChanged) {
    this._doc.result = this._result;
    this._resultShard.replace(this._key, this._doc);
  }
  p.storeWatch("SaveEdge", t);
};

exports.Edge = Edge;
