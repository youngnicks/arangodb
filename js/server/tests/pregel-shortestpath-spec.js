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
        var distanceAttrib
        var next;

        var getDistance = function (edge) {
          if (distanceAttrib) {
            return edge[distanceAttrib];
          } else {
            return 1;
          }
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
        if (global.step === 0 && !result.pathStep) {
          result={
            inBound : [],
            sP : {

            }
          };
          result.sP[vertex._id] = {
            distance : 0,
            shard : vertex._locationInfo.shard
          };
          vertex._outEdges.forEach(function (e) {
            var data = {};
            data[e._from] = {};
            data[e._from][e._to] = {
              //paths : [ [e._from + "_" + e._to] ],
              distance : getDistance(e),
              shard : e._targetVertex.shard
            };

            result.sP[e._to] = data[e._from][e._to];
            message.sendTo(e._targetVertex, data);
          });
          saveResult = true;

        } else if (global.step === 1 && !result.pathStep)  {
          while (message.hasNext()) {
            next = message.next();
            var data = {};
            Object.keys(next.data).forEach(function (v) {
              data[v] = {};
              Object.keys(result.sP).forEach(function (s) {
                data[v][s] = {
                  distance : next.data[v][vertex._id].distance + result.sP[s].distance,
                  shard : result.sP[s].shard
                };
              });
              message.sendTo(next.sender, data);
            });
            saveResult = true;
            result.inBound.push(next.sender);
          }
        } else if (global.step === 2 && !result.pathStep) {
          while (message.hasNext()) {
            next = message.next();
            Object.keys(next.data[vertex._id]).forEach(function(t) {
              if (vertex._id === t) {
                return;
              }
              if (!result.sP[t]) {
                result.sP[t] = {
                  //paths : [[]],
                  distance : Infinity,
                  shard : next.data[vertex._id][t].shard
                };
                saveResult = true;
              }

              if (result.sP[t].distance > next.data[vertex._id][t].distance) {
                saveResult = true;
                result.sP[t] = next.data[vertex._id][t]
              }
            });
          }
          result.inBound.forEach(function (i) {
            message.sendTo(i, result.sP);
          });
        } else if (!result.pathStep) {
          var send = false;
          while (message.hasNext()) {
            next = message.next();
            Object.keys(next.data).forEach(function(t) {
              next.data[t].distance = next.data[t].distance + result.sP[next.sender._id].distance;
              if (vertex._id === t) {
                return;
              }
              if (!result.sP[t]) {
                result.sP[t] = {
                  distance : Infinity,
                  shard : next.data[t].shard
                };
                saveResult = true;
              }
              if (result.sP[t].distance > next.data[t].distance) {
                result.sP[t] = next.data[t]
                saveResult = true;
                send = true;
              }
            });
          }
          if (send) {
            result.inBound.forEach(function (i) {
              message.sendTo(i, result.sP);
            });
          }
        } else {
          while (message.hasNext()) {
            next = message.next();
            if (!next.data.finish) {
              if (!result.sP[next.data.t]) {
                continue;
              }
              if (Math.abs(next.data.d - result.sP[next.data.t].distance) > 0.00001) {
                continue;
              }

              if (result.sP[next.data.t].done) {
                message.sendTo(next.data.r, {
                    finish : mergePaths(next.data.p, result.sP[next.data.t].paths),
                    t :next.data.t
                  }
                );
              } else {
                vertex._outEdges.forEach(function (e) {
                  message.sendTo(e._targetVertex, {
                    r: next.data.r,
                    t : next.data.t,
                    d : result.sP[next.data.t].distance - result.sP[e._to].distance,
                    p :  mergePaths(next.data.p, result.sP[e._to].paths)
                  });
                });
              }
            } else {
              if (!result.sP[next.data.t].paths) {
                result.sP[next.data.t].paths = next.data.finish;
              } else {
                result.sP[next.data.t].paths = result.sP[next.data.t].paths.concat(next.data.finish);
              }
              result.sP[next.data.t].done = true;
              saveResult = true;
            }

          }
        }

        if (saveResult === true) {
          vertex._setResult(result);
        }
        vertex._deactivate();
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
          shardKeys: ["shard_0"],
          allowUserKeys : true
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
    });

    var finalAlgorithm = function (vertex, message, global) {
      var distanceAttrib;
      if (!global.calculatePathes) {
        return;
      }

      var getDistance = function (edge) {
        if (distanceAttrib) {
          return edge[distanceAttrib];
        } else {
          return 1;
        }
      };
      var result = vertex._getResult();
      var sP = result.sP;

      var done = true;
      Object.keys(sP).forEach(function (target) {
        if (!sP[target].done) {
          done = false;
        }
      });
      if (done) {
        return;
      }
      result.pathStep = true;

      vertex._outEdges.forEach(function (e) {
        if (getDistance(e) === result.sP[e._to].distance) {
          result.sP[e._to].paths = [[e._from + "_" + e._to]];
          result.sP[e._to].done = true;
        }
      });
      Object.keys(sP).forEach(function (target) {
        if (result.sP[target].done) {return;}
        if (target === vertex._id) {
          result.sP[target].paths = [];
          result.sP[target].done = true;
          return;
        }
        vertex._outEdges.forEach(function (e) {
          message.sendTo(e._targetVertex, {
            r: vertex._locationInfo,
            t : target,
            d : result.sP[target].distance - result.sP[e._to].distance,
            p : [[e._from + "_" + e._to]]
          });
        });
      })
    };

    it("should identify all distinct graphs", function () {
      //var graph = gN;
      var graph = "ff";
      var id = conductor.startExecution(graph, {
          base : connectedSets.toString(),
          final : finalAlgorithm.toString()
        },
        {
          //distanceAttrib: "",
          calculatePathes: true
        }
      );
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


