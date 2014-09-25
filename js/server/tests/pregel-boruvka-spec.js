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

describe("boruvka", function () {
  "use strict";

  describe("a small graph", function () {

    var gN, v, e, g,
      boruvka = function (vertex, message, global) {
        _ = require("underscore");
        var distanceAttrib;//
        //var distanceAttrib = "distance";
        var next;

        var getDistance = function (edge) {
          if (distanceAttrib) {
            return edge[distanceAttrib];
          } else {
            return 1;
          }
        };
        var getMinActiveEdges = function (vertex, inEdges) {

          var result;
          var min = Infinity;
          vertex._outEdges.forEach(function (e) {
           var obj = {
             _id : e._id,
             _to : e._targetVertex._id,
             _target : e._targetVertex,
             from : vertex._locationInfo,
             distance : getDistance(e)
           };
           if (getDistance(e) < min) {
             result = obj;
             min  = getDistance(e);
           } else if (getDistance(e)  ===  min && [obj._to, result._to].sort()[0] === obj._to) {
             result = obj;
           }
          });

          inEdges.forEach(function (e) {
           var obj = {
             _id : e._id,
             _to : e._targetVertex._id,
             _target : e._targetVertex,
             from : vertex._locationInfo,
             distance : getDistance(e)
           };
           if (getDistance(e) < min) {
             result = obj;
             min  = getDistance(e);
           } else if (getDistance(e)  ===  min && [obj._to, result._to].sort()[0] === obj._to) {
             result = obj;
           }
          });
          return result;
        };


        var result = vertex._getResult();
        if (global.step === 0) {
          vertex._outEdges.forEach(function (e) {
            var data = {edgeId : e._id , distance : getDistance(e)};
            message.sendTo(e._targetVertex, data);
          });
        }

        if (global.step === 1) {
          result.inEdges = [];
          while (message.hasNext()) {
            next = message.next();
            var inEdge = {
              _id : next.data.edgeId,
              _targetVertex : next.sender,
              _to : next.sender._id,
              root : next.sender
            };
            distanceAttrib ? inEdge[distanceAttrib] =  next.data.distance : null;
            result.inEdges.push(inEdge);
          }
          result.closestEdge = getMinActiveEdges(vertex, result.inEdges);
          if (!result.closestEdge) {
            vertex._deactivate()
            return;
          }
          result.type = "unknown";
          result.pointsTo = result.closestEdge._target;
          vertex._outEdges.forEach(function (e) {
            if (e._id === result.closestEdge._id) {
              var edgeResult = e._getResult();
              edgeResult.inSpanTree = true;
              e._setResult(edgeResult);
            }
          });

          message.sendTo(result.closestEdge._target, {type : "Question", edgeId : result.closestEdge._id});

          vertex._setResult(result);
          vertex._deactivate();
        }
        if (global.step > 1) {
          var response ;
          var askers = [];
          while (message.hasNext()) {
            next = message.next();
            switch(next.data.type) {
              case "Question":
                if (next.data.edgeId) {
                  vertex._outEdges.forEach(function (e) {
                    if (e._id === next.data.edgeId) {
                      var edgeResult = e._getResult();
                      edgeResult.inSpanTree = true;
                      e._setResult(edgeResult);
                    }
                  });
                }
                if (next.sender._id === result.closestEdge._target._id ) {
                  if ([vertex._id, next.sender._id].sort()[0] === vertex._id) {
                    result.type = "superVertex";
                    result.connectedSuperVertices = {};
                    result.pointsTo =  vertex._locationInfo;
                    response = {type : "Answer", pointsTo : vertex._locationInfo, isSuperVertex : true};
                  } else if (result.type !== "superVertex") {
                    result.type = "pointsAtSuperVertex";
                    result.pointsTo =  next.sender;
                    response = {type : "Answer", pointsTo : next.sender, isSuperVertex : true};
                  }
                } else {
                  askers.push(next.sender);
                }

                break;
              case "Answer":
                result.pointsTo = next.data.pointsTo;
                if (next.data.isSuperVertex)  {
                  result.type = "pointsAtSuperVertex"
                } else {
                  message.sendTo(result.pointsTo , {type : "Question"});
                }

                break;
              case "SuperStep":
                if (result.pointsTo._id !== next.data.pointsTo._id &&
                  [result.pointsTo._id , next.data.pointsTo._id].sort()[0] === result.pointsTo._id
                  ) {
                  if (result.type !== "superVertex") {
                    message.sendTo(result.pointsTo, next.data);
                  } else {
                    if (!result.connectedSuperVertices[next.data.pointsTo._id] ||
                      result.connectedSuperVertices[next.data.pointsTo._id].distance > next.data.distance
                    ) {
                      result.connectedSuperVertices[next.data.pointsTo._id] = next.data;
                   }
                  }
                }

                break;

              case "finalConnect":
                vertex._outEdges.forEach(function (e) {
                  if (e._id === next.data.edgeId) {
                    var edgeResult = e._getResult();
                    edgeResult.inSpanTree = true;
                    e._setResult(edgeResult);
                  }
                });

                break;

              default :

            }
          }
          if (result.type === "unknown") {
            result.type = "pointsAtSubVertex";
          }
          askers.forEach(function (asker) {
            message.sendTo(asker, response ? response : {
              type : "Answer",
              pointsTo : result.pointsTo ,
              isSuperVertex : result.type === "pointsAtSuperVertex" || result.type === "superVertex" ? true :false
            });
          });
          vertex._deactivate();

        }

        vertex._setResult(result);
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
      for (i = 1; i < 9; i++) {
        saveVertex(i);
      }
      saveEdge(1, 3, 1);
      saveEdge(3, 2, 1);
      saveEdge(2, 1, 1);

      saveEdge(4, 6, 1);
      saveEdge(6, 35, 1);
      saveEdge(35, 7, 1);
      saveEdge(7, 5, 1);
      saveEdge(5, 8, 1);
      saveEdge(8, 4, 1);

    });

    afterEach(function () {
      graph._drop(gN, true);
    });

    var finalAlgorithm = function (vertex, message, global) {
      var distanceAttrib;// = "distance";
      var getDistance = function (edge) {
        if (distanceAttrib) {
          return edge[distanceAttrib];
        } else {
          return 1;
        }
      };
      var finalPhase1 = "vertexReachOut";
      var finalPhase2 = "finalConnect";
      var result = vertex._getResult();

      if (!result.finalPhase) {
        result.finalPhase = finalPhase1;
        vertex._outEdges.forEach(function (e) {
          message.sendTo(e._targetVertex, {type : "SuperStep", pointsTo : result.pointsTo, edgeId : e._id,  root : vertex._locationInfo, distance : getDistance(e)});
        });
        result.inEdges.forEach(function (e) {
          message.sendTo(e._targetVertex, {type : "SuperStep", pointsTo : result.pointsTo, edgeId : e._id, root : e.root, distance : getDistance(e)});
        });
      } else if (result.finalPhase === finalPhase1) {
        result.finalPhase = finalPhase2;
        if (result.type === "superVertex") {
          Object.keys(result.connectedSuperVertices).forEach(function (c) {
            message.sendTo(result.connectedSuperVertices[c].root, {type : "finalConnect", edgeId : result.connectedSuperVertices[c].edgeId});
          });
          return;
        }
      }
      vertex._setResult(result);
     };

    it("should identify all distinct graphs", function () {
      //var graph = gN;
      var graph = "ff";
      var id = conductor.startExecution(graph, {
          base : boruvka.toString(),
          final : finalAlgorithm.toString()
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


