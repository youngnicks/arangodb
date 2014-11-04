/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports*/

////////////////////////////////////////////////////////////////////////////////
/// @brief Pregel wrapper for access to the result graph.
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
/// @author Florian Bartels
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var graphModule = require("org/arangodb/general-graph");


var GraphAccess = function (resultGraphName, stepInfo) {
  'use strict';
  this._resultGraphName = resultGraphName;
  this._stepInfo = stepInfo;
};

GraphAccess.prototype._stopExecution = function () {
  'use strict';
  this._stepInfo.messages = 0;
  this._stepInfo.active = 0;
};

GraphAccess.prototype._activateVerticesByExample = function (example) {
  'use strict';

  var graph = graphModule._graph(this._resultGraphName);
  var updated = 0;
  var self = this;
  example.deleted = false;
  example.active = false;
  var aql = "FOR v in GRAPH_VERTICES(@name, @example, {vertexCollectionRestriction : @c}) " +
    "UPDATE PARSE_IDENTIFIER(v._id).key " +
    "WITH {'active' : true} in @@collection";

  Object.keys(graph.__vertexCollections).forEach(function (c) {

    updated = updated + db._query(
      aql,
      {
        name : self._resultGraphName,
        example : example,
        c : c ,
        '@collection' : c
      }).getExtra().operations.executed;
  });
  this._stepInfo.active += updated;
  return updated;
};

GraphAccess.prototype._deleteVerticesByExample = function (example) {
  'use strict';

  var graph = graphModule._graph(this._resultGraphName);
  var updated = 0;
  var self = this;
  example.deleted = false;
  var aql = "FOR v in GRAPH_VERTICES(@name, @example, {vertexCollectionRestriction : @c}) " +
    "UPDATE PARSE_IDENTIFIER(v._id).key " +
    "WITH {'deleted' : true} in @@collection";

  Object.keys(graph.__vertexCollections).forEach(function (c) {

    updated = updated + db._query(
      aql,
      {
        name : self._resultGraphName,
        example : example,
        c : c ,
        '@collection' : c
      }).getExtra().operations.executed;
  });
  return updated;
};

GraphAccess.prototype._deleteEdgesByExample = function (example) {
  'use strict';
  var graph = graphModule._graph(this._resultGraphName);
  var updated = 0;
  var self = this;
  var aql = "FOR v in GRAPH_EDGES(@name, @example, {edgeCollectionRestriction : @c}) " +
    "UPDATE PARSE_IDENTIFIER(v._id).key " +
    "WITH {'deleted' : true} in @@collection";

  Object.keys(graph.__edgeCollections).forEach(function (c) {
    updated = updated + db._query(
      aql,
      {
        name : self._resultGraphName,
        example : example,
        c : c ,
        '@collection' : c
      }).getExtra().operations.executed;
  });
  return updated;
};

GraphAccess.prototype._verticesByExample = function (example) {
  'use strict';
  example.deleted = false;
  var aql = "RETURN GRAPH_VERTICES(@name, @example)";
  return db._query(aql, {name : this._resultGraphName, example : example});
};

GraphAccess.prototype._countVerticesByExample = function (example) {
  'use strict';
  example.deleted = false;
  var aql = "RETURN LENGTH(GRAPH_VERTICES(@name, @example))";
  return db._query(aql, {name : this._resultGraphName, example : example}).toArray()[0];
};

GraphAccess.prototype._countEdgesByExample = function (example) {
  'use strict';
  var aql = "RETURN LENGTH(GRAPH_EDGES(@name, @example))";
  return db._query(aql, {name : this._resultGraphName, example : example}).toArray()[0];
};

exports.GraphAccess = GraphAccess;
