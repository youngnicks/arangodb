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
  "UnitTestsPregelVertex1" : {
    "type" : 2,
    "resultCollection" : "P_305000077_RESULT_UnitTestsPregelVertex1",
    "originalShards" : {
      "s305000059" : "Pancho", "s305000060" : "Perry", "s305000061" : "Pavel", "s305000062" : "Pancho"
    },
    "resultShards" :
      { "s305000079" : "Pancho", "s305000080" : "Perry", "s305000081" : "Pavel", "s305000082" : "Pancho" }
  },
  "UnitTestsPregelVertex2" :
    { "type" : 2,
      "resultCollection" : "P_305000077_RESULT_UnitTestsPregelVertex2",
      "originalShards" : {
        "s305000064" : "Perry", "s305000065" : "Pancho", "s305000066" : "Pavel", "s305000067" : "Perry"
      },
      "resultShards" : {
        "s305000084" : "Perry", "s305000085" : "Pancho", "s305000086" : "Pavel", "s305000087" : "Perry"
      }
  },
  "UnitTestsPregelEdge2" : {
    "type" : 3,
    "resultCollection" : "P_305000077_RESULT_UnitTestsPregelEdge2",
    "originalShards" : {
      "s305000069" : "Pavel", "s305000070" : "Pancho", "s305000071" : "Perry", "s305000072" : "Pavel"
    },
    "resultShards" : {
      "s305000089" : "Pavel", "s305000090" : "Pancho", "s305000091" : "Perry", "s305000092" : "Pavel"
    }
  }
}



describe("Pregel Worker", function () {
  "use strict";

  describe("using a graph", function () {

    var graphName = "UnitTestPregelGraph";
    var clusterServer;

    beforeEach(function () {
    });

    describe("executeStep", function () {

      beforeEach(function () {

      });

      afterEach(function () {

      });

      /*
      it("should first executeStep", function () {
        var dbSpy = {
          ensureHashIndex : function () {

          },
          save: function() {}
        }, collectionSpy = {
          save : function () {

          }
        };
        spyOn(db, "_create").and.returnValue(dbSpy);
        spyOn(db, "_query");
        spyOn(collectionSpy, "save");
        spyOn(pregel, "getWorkCollection").and.returnValue(collectionSpy);
        spyOn(pregel, "getGlobalCollection").and.returnValue(collectionSpy);
        spyOn(dbSpy, "ensureHashIndex");
        spyOn(ArangoServerState, "id").and.returnValue("Pavel");
        worker.executeStep(1, 0, {map : mapping})
        expect(db._create).toHaveBeenCalledWith("work_1");
        expect(db._create).toHaveBeenCalledWith("messages_1");
        expect(db._query).toHaveBeenCalledWith("FOR v IN @@original INSERT {'_key' : v._key, 'activated' : true, " +
          "'deleted' : false, 'result' : {} } INTO  @@result", { '@original' : 's305000061', '@result' : 's305000081' }
        );
        expect(db._query).toHaveBeenCalledWith("FOR v IN @@original INSERT {'_key' : v._key, 'activated' : true, " +
          "'deleted' : false, 'result' : {} } INTO  @@result", { '@original' : 's305000066', '@result' : 's305000086' }
        );
        expect(db._query).toHaveBeenCalledWith("FOR v IN @@original INSERT {'_key' : v._key, 'activated' : true, " +
          "'deleted' : false, 'result' : {}, '_from' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._from).collection, @collectionMapping), " +
          "'/', PARSE_IDENTIFIER(v._from).key), '_to' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._to).collection, @collectionMapping), " +
          "'/', PARSE_IDENTIFIER(v._to).key)} INTO  @@result", { '@original' : 's305000069', '@result' : 's305000089',
            collectionMapping : {
              UnitTestsPregelVertex1 : 'P_305000077_RESULT_UnitTestsPregelVertex1',
              UnitTestsPregelVertex2 : 'P_305000077_RESULT_UnitTestsPregelVertex2',
              UnitTestsPregelEdge2 : 'P_305000077_RESULT_UnitTestsPregelEdge2'
            }
          }
        );
        expect(db._query).toHaveBeenCalledWith("FOR v IN @@original INSERT {'_key' : v._key, 'activated' : true, " +
          "'deleted' : false, 'result' : {}, '_from' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._from).collection, @collectionMapping), " +
          "'/', PARSE_IDENTIFIER(v._from).key), '_to' : CONCAT(TRANSLATE(PARSE_IDENTIFIER(v._to).collection, @collectionMapping), " +
          "'/', PARSE_IDENTIFIER(v._to).key)} INTO  @@result", { '@original' : 's305000072', '@result' : 's305000092',
            collectionMapping : {
              UnitTestsPregelVertex1 : 'P_305000077_RESULT_UnitTestsPregelVertex1',
              UnitTestsPregelVertex2 : 'P_305000077_RESULT_UnitTestsPregelVertex2',
              UnitTestsPregelEdge2 : 'P_305000077_RESULT_UnitTestsPregelEdge2'
            }
          }
        );
        expect(dbSpy.ensureHashIndex).toHaveBeenCalledWith("toServer");
        expect(collectionSpy.save).toHaveBeenCalled();

      });
      */


    });

    describe("task done for vertex", function () {

      var executionNumber, globalCol, COUNTER, vertex1, vertex2, vertex3, vC, step;

      beforeEach(function () {
        executionNumber = "UnitTestPregel";
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
          expect(ArangoClusterComm).toHaveBeenCalledWith();
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
