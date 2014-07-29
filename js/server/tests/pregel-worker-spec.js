/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState, ArangoClusterComm, ArangoClusterInfo */

////////////////////////////////////////////////////////////////////////////////
/// @brief test the general-graph class
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
var arangodb = require("org/arangodb");
var db = arangodb.db;
var ArangoError = arangodb.ArangoError;
var pregel = require("org/arangodb/pregel");
var worker = pregel.Worker;
var conductor = pregel.Conductor;
var s1 = "s305000059";
var s2 = "s305000060";
var s3 = "s305000061";
var s4 = "s305000062";
var s5 = "s305000079";
var s6 = "s305000080";
var s7 = "s305000081";
var s8 = "s305000082";
var s9 = "s305000064";
var s10 = "s305000065";
var s11 = "s305000066";
var s12 = "s305000067";
var s13 = "s305000084";
var s14 = "s305000085";
var s15 = "s305000086";
var s16 = "s305000087";
var s17 = "s305000069";
var s18 = "s305000070";
var s19 = "s305000071";
var s20 = "s305000072";
var s21 = "s305000089";
var s22 = "s305000090";
var s23 = "s305000091";
var s24 = "s305000092";

var mapping = {
  "UnitTestsPregelVertex1": {
    "type": 2,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex1",
    "originalShards": {},
    "resultShards": {}
  },
  "UnitTestsPregelVertex2": {
    "type": 2,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex2",
    "originalShards": {},
    "resultShards": {}
  },
  "UnitTestsPregelEdge2": {
    "type": 3,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelEdge2",
    "originalShards": {},
    "resultShards": {}
  }
};
mapping.UnitTestsPregelVertex1.originalShards[s1] = "Pancho";
mapping.UnitTestsPregelVertex1.originalShards[s2] = "Perry";
mapping.UnitTestsPregelVertex1.originalShards[s3] = "Pavel";
mapping.UnitTestsPregelVertex1.originalShards[s4] = "Pancho";


mapping.UnitTestsPregelVertex1.resultShards[s5] = "Pancho";
mapping.UnitTestsPregelVertex1.resultShards[s6] = "Perry";
mapping.UnitTestsPregelVertex1.resultShards[s7] = "Pavel";
mapping.UnitTestsPregelVertex1.resultShards[s8] = "Pancho";

mapping.UnitTestsPregelVertex2.originalShards[s9] = "Pancho";
mapping.UnitTestsPregelVertex2.originalShards[s10] = "Perry";
mapping.UnitTestsPregelVertex2.originalShards[s11] = "Pavel";
mapping.UnitTestsPregelVertex2.originalShards[s12] = "Pancho";


mapping.UnitTestsPregelVertex2.resultShards[s13] = "Pancho";
mapping.UnitTestsPregelVertex2.resultShards[s14] = "Perry";
mapping.UnitTestsPregelVertex2.resultShards[s15] = "Pavel";
mapping.UnitTestsPregelVertex2.resultShards[s16] = "Pancho";

mapping.UnitTestsPregelEdge2.originalShards[s17] = "Pancho";
mapping.UnitTestsPregelEdge2.originalShards[s18] = "Perry";
mapping.UnitTestsPregelEdge2.originalShards[s19] = "Pavel";
mapping.UnitTestsPregelEdge2.originalShards[s20] = "Pancho";


mapping.UnitTestsPregelEdge2.resultShards[s21] = "Pancho";
mapping.UnitTestsPregelEdge2.resultShards[s22] = "Perry";
mapping.UnitTestsPregelEdge2.resultShards[s23] = "Pavel";
mapping.UnitTestsPregelEdge2.resultShards[s24] = "Pancho";



describe("Pregel Worker", function () {
  "use strict";

  describe("using a graph", function () {

    var executionNumber;

    beforeEach(function () {
      executionNumber = "UnitTestPregel";
    });

    describe("executeStep", function () {

      beforeEach(function () {
        try {
          db._drop(pregel.genWorkCollectionName(executionNumber));
        } catch (ignore) { }
        try {
          db._drop(pregel.genMsgCollectionName(executionNumber));
        } catch (ignore) { }
        try {
          db._drop(pregel.genGlobalCollectionName(executionNumber));
        } catch (ignore) { }
        spyOn(ArangoServerState, "id").and.returnValue("Pavel");
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          var i;
          for (i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === ArangoServerState.id()) {
              try {
                db._create(shards[i]);
              } catch (ignore) {
              }

              try {
                db._create(resultShards[i]);
              } catch (ignore) {
              }

            }

          }
        });
      });

      afterEach(function () {
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          for (var i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === ArangoServerState.id()) {
              db._drop(shards[i]);
              db._drop(resultShards[i]);
            }

          }
        });
        db._drop(pregel.genWorkCollectionName(executionNumber));
        db._drop(pregel.genMsgCollectionName(executionNumber));
        db._drop(pregel.genGlobalCollectionName(executionNumber));
      });

      it("should first executeStep", function () {
        worker.executeStep(executionNumber, 0, {map : mapping})
      });

    });

    describe("task done for vertex", function () {

      var globalCol, messageCol, COUNTER, CONDUCTOR, MAP,
        vertex1, vertex2, vertex3, vertex4, vertex5,
        vC, vCRes, step, conductorName,
        setActiveAndMessages = function () {
          var queue = new pregel.MessageQueue(executionNumber, vC + "/v1", step);
          queue.sendTo(vC + "/v2", "My message");
          queue.sendTo(vC + "/v3", "My message");
          db[vCRes].updateByExample({active: false}, {active: true});
          // var queue = new pregel.MessageQueue(vertex1._id);
          // queue.sendTo(vertex2._id, "My message");
          // queue.sendTo(vertex3._id, "My message");
        },

        saveVertex = function(key) {
          var vid = db[vC].save({_key: key})._id;
          db[vCRes].save({
            _key: key,
            active: false,
            deleted: false,
            result: {}
          });
          var v = new pregel.Vertex(
            executionNumber,
            vid
          );
          spyOn(v, "_save");
          return v;
        };

      beforeEach(function () {
        vC = "UnitTestVertices";
        vCRes = "P_" + executionNumber + "_RESULT_" + vC;
        conductorName = "Claus";
        step = 2;
        try {
          db._drop(vC);
        } catch (ignore) { }
        try {
          db._drop(vCRes);
        } catch (ignore) { }
        try {
          db._drop(pregel.genGlobalCollectionName(executionNumber));
        } catch (ignore) { }
        COUNTER = "counter";
        CONDUCTOR = "conductor";
        MAP = "map";

        var map = {};
        map[vC] = {};
        var vCMap = map[vC];
        vCMap.type = 2;
        vCMap.resultCollection = vCRes;
        vCMap.originalShards = {};
        vCMap.originalShards[vC] = "localhost";
        vCMap.resultShards = {};
        vCMap.resultShards[vCRes] = "localhost";

        globalCol = db._create(pregel.genGlobalCollectionName(executionNumber));
        messageCol = db._createEdgeCollection(pregel.genMsgCollectionName(executionNumber));
        globalCol.save({_key: COUNTER, count: 3});
        globalCol.save({_key: CONDUCTOR, name: conductorName});
        globalCol.save({_key: MAP, map: map});
        db._create(vC);
        db._create(vCRes);
        vertex1 = saveVertex("v1");
        vertex2 = saveVertex("v2");
        vertex3 = saveVertex("v3");
        vertex4 = saveVertex("v4");
        vertex5 = saveVertex("v5");
        if (!ArangoClusterInfo.getResponsibleShard) {
          ArangoClusterInfo.getResponsibleShard = function () {
            return undefined;
          };
        }
        spyOn(ArangoClusterInfo, "getResponsibleShard").and.callFake(function (v) {
          return v.split("/")[0];
        });
      });

      afterEach(function () {
        db._drop(vC);
        globalCol.drop();
        messageCol.drop();
      });

      it("should decrease the global counter by one", function () {
        worker.vertexDone(executionNumber, vertex1, {step: step});
        expect(globalCol.document(COUNTER).count).toEqual(2);
      });

      it("should save the finished vertex", function () {
        worker.vertexDone(executionNumber, vertex1, {step: step});
        expect(vertex1._save).toHaveBeenCalled();
        expect(vertex2._save).not.toHaveBeenCalled();
        expect(vertex3._save).not.toHaveBeenCalled();
      });

      describe("processing the last vertex", function () {

        beforeEach(function () {
          worker.vertexDone(executionNumber, vertex1, {step: step});
          worker.vertexDone(executionNumber, vertex2, {step: step});
        });

        it("should callback the conductor in cluster case", function () {
          var body = JSON.stringify({
            step: step,
            executionNumber: executionNumber,
            messages: 0,
            active: 0
          });
          spyOn(ArangoServerState, "role").and.returnValue("PRIMARY");
          spyOn(ArangoClusterComm, "asyncRequest");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith(
            "POST",
            "server:" + conductorName,
            db._name(),
            "/_api/pregel",
            body,
            {},
            {}
          );
        });

        it("should send messages and active in cluster case", function () {
          setActiveAndMessages();
          var body = JSON.stringify({
            step: step,
            executionNumber: executionNumber,
            messages: 5,
            active: 2
          });
          spyOn(ArangoServerState, "role").and.returnValue("PRIMARY");
          spyOn(ArangoClusterComm, "asyncRequest");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith(
            "POST",
            "server:" + conductorName,
            db._name(),
            "/_api/pregel",
            body,
            {},
            {}
          );
        });

        it("should call the conductor in single server case", function () {
          spyOn(ArangoServerState, "role").and.returnValue("UNDEFINED");
          spyOn(conductor, "finishedStep");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(conductor.finishedStep).toHaveBeenCalledWith(
            executionNumber,
            "localhost",
            {
              step: step,
              active: 0,
              messages: 0
            }
          );
        });

        it("should call the conductor in single server case", function () {
          setActiveAndMessages();
          spyOn(ArangoServerState, "role").and.returnValue("UNDEFINED");
          spyOn(conductor, "finishedStep");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(conductor.finishedStep).toHaveBeenCalledWith(
            executionNumber,
            "localhost",
            {
              step: step,
              active: 5,
              messages: 2
            }
          );
        });

      });

    });

  });

});
