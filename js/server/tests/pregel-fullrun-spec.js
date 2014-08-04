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

var pregel = require("org/arangodb/pregel");
var conductor = pregel.Conductor;
var graph = require("org/arangodb/general-graph");
var _ = require("underscore");
var ERRORS = require("org/arangodb").errors;
var coordinator = ArangoServerState.isCoordinator();

describe("Full Pregel execution", function () {
  "use strict";

  describe("a small unsharded graph", function () {

    var gN, v, e, g,
      connectedSets = function (vertex, message, global) {
        var inc = message.getMessages();
        var next;

        if (global.step === 0) {
          vertex._result = {
            inGraph: vertex._key,
            inBound: []
          };
        }
        var min = vertex._result.inGraph;
        if (global.step === 1) {
          while (inc.hasNext()) {
            next = inc.next();
            vertex._result.inBound.push(next._from);
            if (next.data < min) {
              min = next.data;
            }
          }
        } else if (global.step > 1) {
          while (inc.hasNext()) {
            next = inc.next();
            if (next.data < min) {
              min = next.data;
            }
          }
        }
        if (global.step < 2 || min < vertex._result.inGraph) {
          vertex._result.inGraph = min;
          var outBound = vertex._outEdges.map(function (e) {
            return e._to;
          });
          outBound.concat(vertex._result.inBound).forEach(function (t) {
            message.sendTo(t, vertex._result.inGraph);
          });
        }
        vertex._deactivate();
      };

    beforeEach(function () {
      gN = "UnitTestPregelGraph";
      v = "UnitTestVertices";
      e = "UnitTestEdges";

      if (graph._exists(gN)) {
        graph._drop(gN, true);
      }
      g = graph._create(
        gN,
        [graph._undirectedRelation(e, [v])]
      );

      var saveVertex = function (key) {
        g[v].save({_key: String(key)});
      };

      var saveEdge = function (from, to) {
        g[e].save(v + "/" + from, v + "/" + to, {});
      };

      var i;
      for (i = 1; i < 14; i++) {
        saveVertex(i);
      }
      saveEdge(1, 3);
      saveEdge(2, 1);
      saveEdge(2, 5);
      saveEdge(4, 3);
      saveEdge(4, 2);
      saveEdge(6, 7);
      saveEdge(8, 7);
      saveEdge(9, 10);
      saveEdge(10, 11);
      saveEdge(11, 12);
      saveEdge(12, 13);
    });

    afterEach(function () {
      graph._drop(gN, true);
    });

    it("should identify all distinct graphs", function () {
      var id = conductor.startExecution(gN, connectedSets.toString());
      var count = 0;
      var resGraph = "LostInBattle";
      var res;
      while (count < 10) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "finished") {
          res = conductor.getResult(id);
          resGraph = res.result.graphName;
          break;
        }
        count++;
      }
      expect(resGraph).not.toEqual("LostInBattle");
      expect(res.error).toBeFalsy();
      var resG = graph._graph(resGraph);
      var vc = resG._vertexCollections()[0];
      var resultVertices = vc.toArray();
      _.each(resultVertices, function (v) {
        var numVKey = parseInt(v._key, 10);
        if (numVKey < 6) {
          expect(v.result.inGraph).toEqual("1");
        } else if (numVKey < 9) {
          expect(v.result.inGraph).toEqual("6");
        } else {
          expect(v.result.inGraph).toEqual("10");
        }
      });
    });

    if (coordinator) {

      it("should trigger a timeout event", function () {
        var timeOut = 5;
        spyOn(pregel, "getTimeoutConst").and.returnValue(timeOut);
        var id = conductor.startExecution(gN, connectedSets.toString());
        require("internal").wait(timeOut * 2);
        expect(conductor.getInfo(id).state).toEqual("error");
        var res = conductor.getResult(id);
        expect(res.error).toBeTruthy();
        expect(res.code).toEqual(ERRORS.ERROR_PREGEL_TIMEOUT.code);
        expect(res.errorMessage).toEqual(ERRORS.ERROR_PREGEL_TIMEOUT.message);
      });

    }

    it("should return a syntax error message due to malformed algorithm", function () {
      var myPregel = function (vertex, message, global) {
        var inc = message.getMessages();
        var next;
        abc = def
      };
      var id = conductor.startExecution(gN, myPregel.toString());
      var count = 0;
      var result = "LostInBattle";
      while (count < 10) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "error") {
          result = conductor.getResult(id);
          break;
        }
        count++;
      }
      expect(result.error).toEqual(true);
      expect(result.errorNum).toEqual(4004);
    });

    it("should return an error message due to misusage of messages.sentTo", function () {
      var myPregel = function (vertex, message, global) {
        var inc = message.getMessages();
        var next;

        if (global.step === 0) {
          vertex._result = {
            inGraph: vertex._key,
            inBound: []
          };
        }
        var min = vertex._result.inGraph;
        if (global.step === 1) {
          while (inc.hasNext()) {
            next = inc.next();
            vertex._result.inBound.push(next._from);
            if (next.data < min) {
              min = next.data;
            }
          }
        } else if (global.step > 1) {
          while (inc.hasNext()) {
            next = inc.next();
            if (next.data < min) {
              min = next.data;
            }
          }
        }
        if (global.step < 2 || min < vertex._result.inGraph) {
          vertex._result.inGraph = min;
          var outBound = vertex._outEdges.map(function (e) {
            return e._to;
          });
          outBound.concat(vertex._result.inBound).forEach(function () {
            message.sendTo(null);
          });
        }
        vertex._deactivate();
      };
      var id = conductor.startExecution(gN, myPregel.toString());
      var count = 0;
      var result = "LostInBattle";
      while (count < 10) {
        require("internal").wait(1);
        if (conductor.getInfo(id).state === "error") {
          result = conductor.getResult(id);
          break;
        }
        count++;
      }
      expect(result.error).toEqual(true);
      expect(result.errorNum).toEqual(4005);
    });


  });

});


