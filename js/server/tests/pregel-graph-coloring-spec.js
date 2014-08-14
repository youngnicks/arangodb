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
var helper = require("org/arangodb/aql-helper");
var getQueryResults = helper.getQueryResults;


describe("Graph coloring Pregel execution", function () {
  "use strict";

  describe("a small graph", function () {

    var gN, v, e, g,
      graphColoring = function (vertex, message, global) {
        var inc = message.getMessages();
        var next, color = "#25262a";
        require("internal").print(global)
        if (global.color) {
          color = global.color;
        }

        var PHASE_PRE_INITIALIZATION = "1";
        var PHASE_INITIALIZATION = "2";
        var PHASE_CONFLICT_RESOLUTION = "3";
        var NOT_IN_S_AND_DEGREE_ADJUSTING1 = "4";

        if (global.retype === true) {
          vertex._result.type = "unknown";
        }

        switch(vertex._result.phase) {
          case PHASE_PRE_INITIALIZATION:
            if (vertex._result.type !== "unknown") {
              vertex._deactivate();
              return;
            }
            vertex._result.phase = PHASE_INITIALIZATION;
            if (!vertex._result.degree) {
              while (inc.hasNext()) {
                next = inc.next();
                if (vertex._result.neighbors.indexOf(next.sender.id) === -1) {
                  vertex._result.neighbors.push(next.sender.id);
                }
              }
              vertex._result.degree = vertex._result.neighbors.length;
            }
            var random = Math.random();
            if (1.0/(2*vertex._result.degree) <= random ) {
              vertex._result.type = "TentativelyInS";
              vertex._result.neighbors.forEach(function (e) {
                message.sendTo(e, {id : vertex._id});
              });
            }
            break;



          case PHASE_INITIALIZATION:
            vertex._result.phase = PHASE_CONFLICT_RESOLUTION;
            var iDs = [vertex._id];
            if (vertex._result.type === "TentativelyInS") {
              while (inc.hasNext()) {
                next = inc.next();
                iDs.push(next.data.id);
              }
              if (vertex._id === iDs.sort()[0]) {
                vertex._result.type = "InS";
                vertex._result.color = color;
                vertex._result.neighbors.forEach(function (e) {
                  message.sendTo(e, {msg : "neighbor-in-set", id : vertex._id});
                });
                vertex._delete();
              } else {
                vertex._result.type = "unknown";
              }
            }

            break;



          case PHASE_CONFLICT_RESOLUTION:
            vertex._result.phase = NOT_IN_S_AND_DEGREE_ADJUSTING1;
            while (inc.hasNext()) {
              next = inc.next();
              if (next.data.msg ===  "neighbor-in-set") {
                vertex._result.type = "NotInS";
                vertex._result.neighbors.splice(vertex._result.neighbors.indexOf(next.data.id), 1);
              }
            }
            if (vertex._result.type === "NotInS") {
              vertex._result.neighbors.forEach(function (e) {
                message.sendTo(e, {msg : "empty-decrement-degree"});
              });
              vertex._deactivate();
            }
            break;




          case NOT_IN_S_AND_DEGREE_ADJUSTING1:
            vertex._result.phase = PHASE_PRE_INITIALIZATION;
            while (inc.hasNext()) {
              next = inc.next();
              if (vertex._result.type === "unknown") {
                vertex._result.degree = vertex._result.degree -1;
              }
            }
            if (vertex._result.type !== "unknown") {
              vertex._deactivate();
            }

            break;




          default:
            vertex._result={
              type : "unknown",
              neighbors : [],
              phase : PHASE_PRE_INITIALIZATION
            };
            vertex._outEdges.forEach(function (e) {
              vertex._result.neighbors.push(e._targetVertex._id);
              message.sendTo(e._targetVertex);
            });
        }

      };

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
      for (i = 1; i < 11; i++) {
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

      var conductorAlgorithm = function (graphAccess, globals, stepInfo) {
        var result = {};
        if (!globals.usedColors) {
          globals.usedColors = ['#25262a'];
        }
        var newColor = '#25262a';
        globals.retype = false
        if( stepInfo.active === 0 && stepInfo.messages === 0) {
          if (graphAccess._countVerticesByExample({"result.type" : "unknown"}) === 0) {
            if (graphAccess._activateVerticesByExample({"result.type" : "NotInS"}) > 0) {
              globals.retype = true;
              while (globals.usedColors.indexOf(newColor) !== -1) {
                newColor = '#' + Math.random().toString(16).substring(2, 8);
              }
              globals.usedColors.push(newColor);
              globals.color = newColor;
              result.continuePregel = true;
            }
          }
        }
        return result;
      };

      var id = conductor.startExecution(gN, graphColoring.toString(),conductorAlgorithm.toString());
      var count = 0;
      var resGraph = "LostInBattle";
      var res;
      while (count < 10000000) {
        require("internal").wait(10);
        require("console").log(JSON.stringify(conductor.getInfo(id)));
        if (conductor.getInfo(id).state === "finished") {
          res = conductor.getResult(id);
          resGraph = res.result.graphName;
          var end = require("internal").time();
          require("internal").print(end - start);
          break;
        }
        count++;
      }

    });

  });
});


