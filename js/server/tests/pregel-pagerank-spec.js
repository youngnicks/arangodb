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
/// @author Michael Hackstein
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var conductor = pregel.Conductor;
var graph = require("org/arangodb/general-graph");
var _ = require("underscore");
var ERRORS = require("org/arangodb").errors;
var coordinator = ArangoServerState.isCoordinator();

describe("Pregel PageRank", function () {
  "use strict";

  describe("on a small graph", function () {

    var gN, v, e, g,
      pageRank = function (vertex, message, global) {
        var total = global.vertexCount;
        var edgeCount;
        var send;
        if (global.step === 0) {
          edgeCount = vertex._outEdges.length;
          var initPR = 1 / total;
          vertex._result = {
            rank: initPR,
            edgeCount: edgeCount
          };
          send = initPR / edgeCount;
          vertex._outEdges.forEach(function (e) {
            message.sendTo(e._targetVertex, send);
          });
          return;
        }
        edgeCount = vertex._result.edgeCount;
        var alpha = global.alpha;
        var newPR = 0;
        var inc = message.getMessages();
        var next;
        while (inc.hasNext()) {
          next = inc.next();
          newPR += next.data;
        }
        newPR *= alpha;
        newPR += (1 - alpha) / total;
        vertex._result.rank = newPR;
        send = newPR / edgeCount;
        vertex._outEdges.forEach(function (e) {
          message.sendTo(e._targetVertex, send);
        });
      },
      superStep = function (graph, globals) {
        if (globals.step === 31) {
          graph._stopExecution();
          return;
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
      var saveEdge = function (from, to) {
        g[e].save(v + "/" + from, v + "/" + to, {
          shard_0: String(from),
          to_shard_0: String(to)
        });
      };

      var i;
      for (i = 1; i < 12; i++) {
        saveVertex(i);
      }
      saveEdge(2, 3);
      saveEdge(3, 2);
      saveEdge(4, 1);
      saveEdge(4, 2);
      saveEdge(5, 2);
      saveEdge(5, 4);
      saveEdge(5, 6);
      saveEdge(6, 2);
      saveEdge(6, 5);
      saveEdge(7, 2);
      saveEdge(7, 5);
      saveEdge(8, 2);
      saveEdge(8, 5);
      saveEdge(9, 2);
      saveEdge(9, 5);
      saveEdge(10, 5);
      saveEdge(11, 5);
    });

    afterEach(function () {
      graph._drop(gN, true);
    });

    it("should compute the pageRank", function () {
      gN = "lager";
      var gr = require("org/arangodb/general-graph")._graph(gN);
      var id = conductor.startExecution(gN, pageRank.toString(), superStep.toString(), {
        alpha: 0.85,
//        vertexCount: 11
        vertexCount: gr._vertices().count()
      });
      var count = 0;
      var resGraph = "LostInBattle";
      var res;
 //     require("internal").wait(40);
      while (count < 1000) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "finished") {
          res = conductor.getResult(id);
          resGraph = res.result.graphName;
          break;
        }
        if (conductor.getInfo(id).state === "error") {
          require("internal").print(conductor.getResult(id).errorMessage);
          throw "There was an error";
        }
        count++;
      }
      expect(resGraph).not.toEqual("LostInBattle");
      expect(res.error).toBeFalsy();
      expect(conductor.getInfo(id).step).toEqual(32);
      var resG = graph._graph(resGraph);
      var vc = resG._vertexCollections()[0];
      var resultVertices = vc.toArray();
      /*
      _.each(resultVertices, function (v) {
        var exp;
        switch (v._key) {
        case "1":
          exp = 0.028;
          break;
        case "2":
          exp = 0.323;
          break;
        case "3":
          exp = 0.29;
          break;
        case "4":
        case "6":
          exp = 0.033;
          break;
        case "5":
          exp = 0.068;
          break;
        default:
          exp = 0.014;
        }
        expect(v.result.rank).toBeCloseTo(exp, 3, "for vertex " + v._key);
      });
      */
    });

  });

});



