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
          require("internal").print(collection, shards, shards.length)
          for (var i = 0; i < shards.length; i++) {
            require("internal").print(mapping[collection].originalShards[shards[i]], shards, shards.length)
            if (mapping[collection].originalShards[shards[i]] === id) {
              require("internal").print("MAPPING", shards);
              try {
                require("internal").print("dropping", resultShards[i])
                db._drop(resultShards[i]);
              } catch (ignore) {
                require("internal").print(ignore)
              }
              try {
                require("internal").print("dropping", shards[i])
                db._drop(shards[i]);
              } catch (ignore) {
                require("internal").print(ignore)
              }
              try {
                if (mapping[collection].type === 3) {
                  db._createEdgeCollection(shards[i]);
                  db[shards[i]].insert({_key : "active", deleted : false, _to : "UnitTestsPregelVertex1/1", _from : "UnitTestsPregelVertex2/2"});
                  db[shards[i]].insert({_key : "deleted",deleted : true, _to : "UnitTestsPregelVertex1/1", _from : "UnitTestsPregelVertex2/3"});
                } else {
                  db._create(shards[i]);
                  db[shards[i]].insert({active : true, _key : "active", deleted : false});
                  db[shards[i]].insert({active : true, _key : "activeButDeleted",deleted : true});
                  db[shards[i]].insert({active : false, _key : "inactive", deleted : false});
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
              require("internal").print(resultShards[i]);
              require("internal").print(db[resultShards[i]].toArray());
              expect(db[resultShards[i]].document("active")).not.toEqual(undefined);
              expect(db[resultShards[i]].document("activeButDeleted")).toEqual(undefined);
              expect(db[resultShards[i]].document("inactive")).toEqual(undefined);
            }
          }
        });
      });

    });

    describe("task done for vertex", function () {

      var globalCol, COUNTER, vertex1, vertex2, vertex3, vC, step;

      beforeEach(function () {
        vC = "UnitTestVertices";
        step = 2;
        try {
          db._drop(vC);
        } catch (ignore) { }
        try {
          db._drop(pregel.genGlobalCollectionName(executionNumber));
        } catch (ignore) { }
        COUNTER = "counter";
        globalCol = db._create(pregel.genGlobalCollectionName(executionNumber));
        globalCol.save({_key: COUNTER, count: 3});
        db._create(vC);
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
      });

      afterEach(function () {
        db._drop(vC);
        db._drop(pregel.genGlobalCollectionName(executionNumber));
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
          spyOn(ArangoServerState, "role").and.returnValue("PRIMARY");
          spyOn(ArangoClusterComm, "asyncRequest");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith();
        });

        it("should call the conductor in single server case", function () {
          spyOn(ArangoServerState, "role").and.returnValue("UNDEFINED");
          spyOn(conductor, "finishedStep");
          worker.vertexDone(executionNumber, vertex3, {step: step});
          expect(conductor.finishedStep).toHaveBeenCalledWith();
        });

      });

    });

  });

});
