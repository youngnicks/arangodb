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
var tasks = require("org/arangodb/tasks");

var mapping = {
  "UnitTestsPregelVertex1": {
    "type": 2,
    "shardKeys": [],
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex1",
    "originalShards": {"UnitTestsPregelVertex1" : "localhost"},
    "resultShards": {"P_305000077_RESULT_UnitTestsPregelVertex1" : "localhost"}
  },
  "UnitTestsPregelVertex2": {
    "type": 2,
    "shardKeys": [],
    "resultCollection": "P_305000077_RESULT_UnitTestsPregelVertex2",
    "originalShards": {"UnitTestsPregelVertex2" : "localhost"},
    "resultShards": {"P_305000077_RESULT_UnitTestsPregelVertex2" : "localhost"}
  },
  "UnitTestsPregelEdge2": {
    "type": 3,
    "shardKeys": [],
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
        db._drop(pregel.genWorkCollectionName(executionNumber));
        db._drop(pregel.genMsgCollectionName(executionNumber));
        db._drop(pregel.genGlobalCollectionName(executionNumber));
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          var i;
          for (i = 0; i < shards.length; i++) {
            if (mapping[collection].originalShards[shards[i]] === id) {
              db._drop(resultShards[i]);
              db._drop(shards[i]);
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
          var i;
          for (i = 0; i < shards.length; i++) {
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
        spyOn(tasks, "register");
        var id = ArangoServerState.id() || "localhost";
        worker.executeStep(executionNumber, 0, {
          map: mapping,
          algorithm: "function(){}"
        });
        expect(db[pregel.genWorkCollectionName(executionNumber)]).not.toEqual(undefined);
        expect(db[pregel.genMsgCollectionName(executionNumber)]).not.toEqual(undefined);
        Object.keys(mapping).forEach(function (collection) {
          var shards = Object.keys(mapping[collection].originalShards);
          var resultShards = Object.keys(mapping[collection].resultShards);
          var i;
          for (i = 0; i < shards.length; i++) {
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

      it("should cleanup", function () {
        spyOn(tasks, "register");
        worker.executeStep(executionNumber, 0, {map: mapping, algorithm: "function(){}"});
        expect(db[pregel.genWorkCollectionName(executionNumber)]).not.toEqual(undefined);
        expect(db[pregel.genMsgCollectionName(executionNumber)]).not.toEqual(undefined);
        expect(db[pregel.genGlobalCollectionName(executionNumber)]).not.toEqual(undefined);
        worker.cleanUp(executionNumber);
        expect(db[pregel.genWorkCollectionName(executionNumber)]).toEqual(undefined);
        expect(db[pregel.genMsgCollectionName(executionNumber)]).toEqual(undefined);
        expect(db[pregel.genGlobalCollectionName(executionNumber)]).toEqual(undefined);
      });

    });

    describe("task done for vertex", function () {

      var globalCol, messageCol, workCol, COUNTER, CONDUCTOR, MAP, ERR,
        vertex1, vertex2, vertex3, vertex4, vertex5,
        vC, vCRes, step, conductorName,
        setActiveAndMessages = function () {
          var queue = new pregel.MessageQueue(executionNumber, {_id: vC + "/v1"}, step);
          queue.sendTo({_id: vC + "/v2"}, "My message");
          queue.sendTo({_id: vC + "/v3"}, "My message");
          db[vCRes].updateByExample({active: false}, {active: true});
        },

        saveVertex = function (key) {
          var vid = db[vC].save({_key: key})._id;
          db[vCRes].save({
            _key: key,
            active: false,
            deleted: false,
            result: {}
          });
          var v = new pregel.Vertex(
            executionNumber,
            {
              _id: vid,
              shard: vCRes
            }
          );
          spyOn(v, "_save");
          return v;
        };

      beforeEach(function () {
        vC = "UnitTestVertices";
        vCRes = "P_" + executionNumber + "_RESULT_" + vC;
        conductorName = "Claus";
        step = 2;
        db._drop(vC);
        db._drop(vCRes);
        db._drop(pregel.genGlobalCollectionName(executionNumber));
        db._drop(pregel.genMsgCollectionName(executionNumber));
        db._drop(pregel.genWorkCollectionName(executionNumber));
        COUNTER = "counter";
        CONDUCTOR = "conductor";
        MAP = "map";
        ERR = "error";

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
        workCol = db._createEdgeCollection(pregel.genWorkCollectionName(executionNumber));
        globalCol.save({_key: COUNTER, count: 3});
        globalCol.save({_key: CONDUCTOR, name: conductorName});
        globalCol.save({_key: MAP, map: map});
        globalCol.save({_key: ERR, error: undefined});
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
        db._drop(vCRes);
        globalCol.drop();
        messageCol.drop();
        workCol.drop();
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
          var transActId = "1337";
          var body = JSON.stringify({
            server: pregel.getServerName(),
            step: step,
            executionNumber: executionNumber,
            messages: 0,
            active: 0,
            error: null
          });
          spyOn(ArangoServerState, "role").and.returnValue("PRIMARY");
          spyOn(ArangoClusterInfo, "uniqid").and.returnValue(transActId);
          spyOn(ArangoClusterComm, "asyncRequest");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith(
            "POST",
            "server:" + conductorName,
            db._name(),
            "/_api/pregel/finishedStep",
            body,
            {},
            {
              coordTransactionID: transActId
            }
          );
        });

        it("should send messages and active in cluster case", function () {
          var transActId = "1337";
          setActiveAndMessages();
          var body = JSON.stringify({
            server: pregel.getServerName(),
            step: step,
            executionNumber: executionNumber,
            messages: 2,
            active: 5,
            error: null
          });
          spyOn(ArangoServerState, "role").and.returnValue("PRIMARY");
          spyOn(ArangoClusterInfo, "uniqid").and.returnValue(transActId);
          spyOn(ArangoClusterComm, "asyncRequest");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith(
            "POST",
            "server:" + conductorName,
            db._name(),
            "/_api/pregel/finishedStep",
            body,
            {},
            {
              coordTransactionID: transActId
            }
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
              messages: 0,
              error: null
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
              messages: 2,
              error: null
            }
          );
        });

        it("should move all messages in single server case", function () {
          setActiveAndMessages();
          spyOn(ArangoServerState, "role").and.returnValue("UNDEFINED");
          spyOn(conductor, "finishedStep");
          expect(messageCol.count()).toEqual(2);
          expect(workCol.count()).toEqual(0);
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(messageCol.count()).toEqual(0);
          expect(workCol.count()).toEqual(2);
        });

      });

    });

  });

});
