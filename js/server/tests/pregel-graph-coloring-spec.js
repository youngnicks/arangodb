/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief test a complete run through pregel's algorithm
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
/// @author Florian Bartels, Michael Hackstein
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var conductor = pregel.Conductor;
var graph = require("org/arangodb/general-graph");
var _ = require("underscore");
var ERRORS = require("org/arangodb").errors;
var coordinator = ArangoServerState.isCoordinator();
var graphColoring = require("org/arangodb/pregel/examples/graph-coloring-algorithm");
var helper = require("org/arangodb/aql-helper");
var getQueryResults = helper.getQueryResults;
var profiler = require("org/arangodb/profiler");


describe("Graph coloring Pregel execution", function () {
  "use strict";

  describe("a small graph", function () {

    var gN, v, e, g;

    beforeEach(function () {
      gN = "UnitTestPregelGraph";
      v = "UnitTestVertices";
      e = "UnitTestEdges";
      var numShards = 4;

      if (graph._exists(gN)) {
        graph._drop(gN, true);
      }
      if (coordinator) {
        db._create(v, {
          numberOfShards: numShards
        });
        db._createEdgeCollection(e, {
          numberOfShards: numShards,
          distributeShardsLike: v,
          shardKeys: ["shard_0"]
        });
      }
      g = graph._create(
        gN,
        [graph._undirectedRelation(e, [v])]
      );

      var saveVertex = function (key) {
        g[v].save({_key: String(key)});
      };
      var saveEdge = function (from, to, distance) {
        g[e].save(v + "/" + from, v + "/" + to, {
          //_key : "" +from+to,
          shard_0: String(from),
          to_shard_0: String(to),
          distance: distance

        });
      };

      var i;
      for (i = 1; i < 12; i++) {
        saveVertex(i);
      }
      saveEdge(1, 2, 2);
      saveEdge(1, 7, 2);
      saveEdge(2, 7, 9);
      saveEdge(7, 6, 8);
      saveEdge(2, 6, 6);
      saveEdge(7, 5, 4);
      saveEdge(5, 2, 3);
      saveEdge(5, 4, 5);
      saveEdge(6, 4, 7);
      saveEdge(4, 2, 19);
      saveEdge(4, 3, 10);
      saveEdge(3, 2, 1);
      saveEdge(8, 9, 1);
      saveEdge(6, 10, 1);
    });

    afterEach(function () {
      graph._drop(gN, true);
    });

    it("should color a graph by pregel", function () {
      var start = require("internal").time();

      var id = conductor.startExecution(gN, graphColoring.getAlgorithm()
      );
      profiler.setup();

      var count = 0;
      var resGraph = "LostInBattle";
      var res;
      while (count < 100000000) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "finished") {
          var end = require("internal").time();
          require("internal").print(end - start);
          res = conductor.getResult(id);
          require("internal").print(res)
          resGraph = res.result.graphName;
          var errors = [];
          graph._graph(resGraph)._vertices({}).toArray().forEach(function (r) {
              if (r.result.type === 3) {
                Object.keys(r.result.neighbors).forEach(function (m) {
                  var n = graph._graph(resGraph)._vertices({_key : m.split("/")[1]}, {
                    vertexCollectionRestriction : m.split("/")[0]}).toArray()[0]
                  if (n.result.type === 3 && n.result.color === r.result.color) {
                    errors.push([n._key, r._key]);
                  }
                });
              }
          });
          if (errors) {
            require("internal").print(errors);
          }
          expect(errors.length).toEqual(0);
          break;
        }
        count++;
      }

    });

  });
});


