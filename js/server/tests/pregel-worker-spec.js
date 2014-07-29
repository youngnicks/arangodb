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

var mapping = {
  "UnitTestsPregelVertex1": {
    "type": 2,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex1",
    "originalShards": {"UnitTestsPregelVertex1" : "localhost"},
    "resultShards": {"P_305000077_RESULT_UnitTestsPregelVertex1" : "localhost"}
  },
  "UnitTestsPregelVertex2": {
    "type": 2,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex2",
    "originalShards": {"UnitTestsPregelVertex2" : "localhost"},
    "resultShards": {"P_305000077_RESULT_UnitTestsPregelVertex2" : "localhost"}
  },
  "UnitTestsPregelEdge2": {
    "type": 3,
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelEdge2",
    "originalShards": {"UnitTestsPregelEdge2" : "localhost"},
    "resultShards": {"P_305000077_RESULT_UnitTestsPregelEdge2" : "localhost"}
  }
};

describe("Pregel Worker", function () {
  "use strict";

  describe("using a graph", function () {

    var executionNumber;

    beforeEach(function () {
      executionNumber = "UnitTestPregel";
    });

    describe("executeStep", function () {

      beforeEach(function () {
        var id = ArangoServerState.id() || "localhost";
        try {
          db._drop(pregel.genWorkCollectionName(executionNumber));
        } catch (ignore) { }
        try {
          db._drop(pregel.genMsgCollectionName(executionNumber));
        } catch (ignore) { }
        try {
          db._drop(pregel.genGlobalCollectionName(executionNumber));
        } catch (ignore) { }
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          var i;
          for (i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === id) {
              try {
                db._drop(resultShards[i]);
              } catch (ignore) {
              }
              try {
                db._drop(shards[i]);
              } catch (ignore) {
              }
              try {
                if (mapping[collection].type === 3) {
                  db._createEdgeCollection(shards[i]);
                  db[shards[i]].insert("UnitTestsPregelVertex2/2", "UnitTestsPregelVertex1/1", {_key : "edgeA"});
                  db[shards[i]].insert("UnitTestsPregelVertex2/3", "UnitTestsPregelVertex1/1", {_key : "edgeB"});
                } else {
                  db._create(shards[i]);
                  db[shards[i]].insert({_key : "vertexA"});
                  db[shards[i]].insert({_key : "vertexB"});
                  db[shards[i]].insert({_key : "vertexC"});
                }
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
        var id = ArangoServerState.id() || "localhost";
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          for (var i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === id) {
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
        var id = ArangoServerState.id() || "localhost";
        worker.executeStep(executionNumber, 0, {map : mapping});
        expect(db["work_" + executionNumber]).not.toEqual(undefined);
        expect(db["messages_" + executionNumber]).not.toEqual(undefined);
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          for (var i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === id) {
              if (mapping[collection].type === 3) {
                expect(db[resultShards[i]].document("edgeA")).not.toEqual(undefined);
                expect(db[resultShards[i]].document("edgeB")).not.toEqual(undefined);
              } else {
                expect(db[resultShards[i]].document("vertexA")).not.toEqual(undefined);
                expect(db[resultShards[i]].document("vertexB")).not.toEqual(undefined);
                expect(db[resultShards[i]].document("vertexC")).not.toEqual(undefined);
              }
            }
          }
        });
      });

    });

    describe("task done for vertex", function () {

      var globalCol, messageCol, COUNTER, CONDUCTOR, MAP, vertex1, vertex2, vertex3,
        vC, vCRes, step, conductorName,
        setActiveAndMessages = function () {
          var queue = new pregel.MessageQueue(executionNumber, vC + "/v1", step);
          queue.sendTo(vC + "/v2", "My message");
          queue.sendTo(vC + "/v3", "My message");
          // var queue = new pregel.MessageQueue(vertex1._id);
          // queue.sendTo(vertex2._id, "My message");
          // queue.sendTo(vertex3._id, "My message");
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
        var vCMap = map[vC] = {};
        vCMap.type = 2;
        vCMap.resultCollection = vCRes;
        vCMap.originalShards = {};
        vCMap.originalShards[vC] = "localhost";
        vCMap.resultShards = {};
        vCMap.resultShards[vC] = "localhost";

        globalCol = db._create(pregel.genGlobalCollectionName(executionNumber));
        messageCol = db._createEdgeCollection(pregel.genMsgCollectionName(executionNumber));
        globalCol.save({_key: COUNTER, count: 3});
        globalCol.save({_key: CONDUCTOR, name: conductorName});
        globalCol.save({_key: MAP, map: map});
        db._create(vC);
        db._create(vCRes);
        vertex1 = new pregel.Vertex(
          executionNumber,
          db[vC].save({_key: "v1"})._id
        );
        spyOn(vertex1, "_save");
        vertex2 = new pregel.Vertex(
          executionNumber,
          db[vC].save({_key: "v2"})._id
        );
        spyOn(vertex2, "_save");
        vertex3 = new pregel.Vertex(
          executionNumber,
          db[vC].save({_key: "v3"})._id
        );
        spyOn(vertex3, "_save");
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
