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

describe("ShortestPath Pregel execution", function () {
  "use strict";

  describe("a small graph", function () {

    var gN, v, e, g,
      connectedSets = function (vertex, message, global) {
        _ = require("underscore");
        var distanceAttrib;
        var inc = message.getMessages();
        var next;

        var getDistance = function (edge) {
          if (distanceAttrib) {
            return edge[distanceAttrib];
          } else {
            return 1;
          }
        };

        var arrayContainsArray = function (list, value) {
          var r = false ;
          list.forEach(function (f) {
            if (_.isEqual(f, value)) {
              r = true;
            }
          });
          return r;

        };

        var mergePaths = function (pathList1, pathList2) {
          var r = [];
          pathList1.forEach(function (p1) {
            pathList2.forEach(function (p2) {
              r.push(p1.concat(p2));
            });
          });
          return r
        };
        var result = vertex._getResult(), saveResult = false;
        if (global.step === 0) {
          result={
            inBound : [],
            shortestPaths : {

            }
          };
          result.shortestPaths[vertex._id] = {
            paths : [[]],
            distance : 0
          };
          vertex._outEdges.forEach(function (e) {
            var data = {};
            data[e._from] = {};
            data[e._from][e._to] = {paths : [[e._id]], distance : getDistance(e)};
            result.shortestPaths[e._to] = data[e._from][e._to];
            message.sendTo(e._targetVertex, data);
          });
          saveResult = true;

        } else if (global.step === 1) {
          while (inc.hasNext()) {
            next = inc.next();
            var data = {};
            Object.keys(next.data).forEach(function (v) {
              data[v] = {};
              Object.keys(result.shortestPaths).forEach(function (s) {
                data[v][s] = {
                  paths : mergePaths(next.data[v][vertex._id].paths, result.shortestPaths[s].paths),
                  distance : next.data[v][vertex._id].distance + result.shortestPaths[s].distance
                };
              });
              message.sendTo(next.sender, data);
            });
            saveResult = true;
            result.inBound.push(next.sender);
          }
        } else if (global.step === 2) {
          while (inc.hasNext()) {
            next = inc.next();
            Object.keys(next.data[vertex._id]).forEach(function(t) {
              if (vertex._id === t) {
                return;
              }
              if (!result.shortestPaths[t]) {
                result.shortestPaths[t] = {paths : [], distance : Infinity};
                saveResult = true;
              }

              if (result.shortestPaths[t].distance > next.data[vertex._id][t].distance) {
                saveResult = true;
                result.shortestPaths[t] = next.data[vertex._id][t]
              } else if (result.shortestPaths[t].distance === next.data[vertex._id][t].distance &&
                !_.isEqual(result.shortestPaths[t].paths, next.data[vertex._id][t].paths)) {
                next.data[vertex._id][t].paths.forEach(function (p) {
                  saveResult = true;
                  result.shortestPaths[t].paths.push(p);
                })
              }
            });
          }
          result.inBound.forEach(function (i) {
            message.sendTo(i, result.shortestPaths);
          });
        } else {
          var send = false;
          while (inc.hasNext()) {
            next = inc.next();
            Object.keys(next.data).forEach(function(t) {
              next.data[t].paths = mergePaths(result.shortestPaths[next.sender._id].paths, next.data[t].paths);
              next.data[t].distance = next.data[t].distance + result.shortestPaths[next.sender._id].distance;
              if (vertex._id === t) {
                return;
              }
              if (!result.shortestPaths[t]) {
                result.shortestPaths[t] = {paths : [[]], distance : Infinity};
                saveResult = true;
              }

              if (result.shortestPaths[t].distance > next.data[t].distance) {
                result.shortestPaths[t] = next.data[t]
                saveResult = true;
                send = true;
              } else if (result.shortestPaths[t].distance === next.data[t].distance &&
                !_.isEqual(result.shortestPaths[t].paths, next.data[t].paths)) {
                  next.data[t].paths.forEach(function (p) {
                  if (!arrayContainsArray(result.shortestPaths[t].paths, p)) {
                    saveResult = true;
                    result.shortestPaths[t].paths.push(p);
                  }
                });
                send = true;
              }
            });
          }
          if (send) {
            result.inBound.forEach(function (i) {
              message.sendTo(i, result.shortestPaths);
            });
          }
        }

        if (saveResult === true) {
          vertex._setResult(result);
        }
        vertex._deactivate();
      };

   /* beforeEach(function () {
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
          _key : "" +from+to,
          shard_0: String(from),
          to_shard_0: String(to),
          distance: distance

        });
      };

      var i;
      for (i = 1; i < 8; i++) {
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
    });

    afterEach(function () {
      graph._drop(gN, true);
    });*/

    it("should identify all distinct graphs", function () {
      //var id = conductor.startExecution(gN, connectedSets.toString());
      var id = conductor.startExecution("ff", {
        base : connectedSets.toString()
      });
      var count = 0;
      var resGraph = "LostInBattle";
      var res;
      while (count < 1000000000000000000) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "finished") {
          res = conductor.getResult(id);
          resGraph = res.result.graphName;
          break;
        }
        count++;
      }

    });
  });
});


