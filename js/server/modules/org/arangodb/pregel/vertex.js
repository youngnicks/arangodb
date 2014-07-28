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
/// @author Florian Bartels, Michael Hackstein, Guido Schwab
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");

var Vertex = function (executionNumber, vertexId) {
  this.active = true;
  this.vertexId = vertexId;
  this.execNumber = executionNumber;
  this.messages = null;
};

Vertex.prototype._deactivate = function () {
  var collection = pregel.getOriginalCollection(this.vertexId);
  db[collection].update(this.vertexId, {active: false});
};

Vertex.prototype._delete = function () {
  var collection = pregel.getOriginalCollection();
  db[collection].remove(vertexId);
};

Vertex.prototype._getEdges = function () {
  return 1;
};

Vertex.prototype._save = function () {

};

Vertex.prototype.type = function () {
  return "vertex";
}

exports.Vertex = Vertex;
