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
/// @author Florian Bartels, Michael Hackstein, Heiko Kernbach
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var conductor = require("org/arangodb/pregel").Conductor;
var worker = require("org/arangodb/pregel").Worker;
var vertex = require("org/arangodb/pregel").Vertex;
var pregel = require("org/arangodb/pregel");
var arangodb = require("org/arangodb");
var db = arangodb.db;
var graph = require("org/arangodb/general-graph");
var ArangoError = arangodb.ArangoError;
var ERRORS = arangodb.errors;
var vc1 = "UnitTestsPregelVertex1";
var vc2 = "UnitTestsPregelVertex2";
var ec1 = "UnitTestsPregelEdge2";
var coordinator = ArangoServerState.isCoordinator();

describe("Pregel Vertex Object Testing", function () {
  "use strict";

  describe("testing vertex methods", function () {

    var mapping, v1, v2, e2, firstDoc, secondDoc, thirdDoc,
      execNr = "unittest_nr_1337";
    var globalCollectionName = pregel.genGlobalCollectionName(execNr);

    beforeEach(function () {
      mapping = {
        "UnitTestsPregelVertex1": {
          "type" : 2,
          "resultCollection" : "P_305000077_RESULT_UnitTestsPregelVertex1",
          "originalShards" : {
            "s305000059" : "Pancho",
            "s305000060" : "Perry",
            "s305000061" : "Pavel",
            "s305000062" : "Pancho"
          },
          "resultShards" : {
            "s305000079" : "Pancho",
            "s305000080" : "Perry",
            "s305000081" : "Pavel",
            "s305000082" : "Pancho"
          }
        },

        "UnitTestsPregelVertex2": {
          "type" : 2,
          "resultCollection" : "P_305000077_RESULT_UnitTestsPregelVertex2",
          "originalShards" : {
            "s305000064" : "Perry",
            "s305000065" : "Pancho",
            "s305000066" : "Pavel",
            "s305000067" : "Perry"
          },
          "resultShards" : {
            "s305000084" : "Perry",
            "s305000085" : "Pancho",
            "s305000086" : "Pavel",
            "s305000087" : "Perry"
          }
        },

        "UnitTestsPregelEdge2": {
          "type" : 3,
          "resultCollection" : "P_305000077_RESULT_UnitTestsPregelEdge2",
          "originalShards" : {
            "s305000069" : "Pavel",
            "s305000070" : "Pancho",
            "s305000071" : "Perry",
            "s305000072" : "Pavel"
          },
          "resultShards" : {
            "s305000089" : "Pavel",
            "s305000090" : "Pancho",
            "s305000091" : "Perry",
            "s305000092" : "Pavel"
          }
        }
      };

      v1 = mapping.UnitTestsPregelVertex1;
      v2 = mapping.UnitTestsPregelVertex2;
      e2 = mapping.UnitTestsPregelEdge2;

      db._drop(vc1);
      db._drop(ec1);
      db._drop(globalCollectionName);
      try {
        db.unittest_vertex2.drop();
      } catch (ignore) {}
      try {
        db.unittest_edge2.drop();
      } catch (ignore) {}
      try {
        db.global_unittest_nr_1337.drop();
      } catch (ignore) {}
      try {
        db.P_305000077_RESULT_UnitTestsPregelVertex1.drop();
      } catch (ignore) {}
      try {
        db.P_305000077_RESULT_UnitTestsPregelVertex2.drop();
      } catch (ignore) {}
      try {
        db.P_305000077_RESULT_UnitTestsPregelEdge2.drop();
      } catch (ignore) {}
      try {
        db.s305000059.drop();
      } catch (ignore) {}
      try {
        db.s305000062.drop();
      } catch (ignore) {}
      try {
        db.s305000079.drop();
      } catch (ignore) {}
      try {
        db.s305000082.drop();
      } catch (ignore) {}
      try {
        db.s305000065.drop();
      } catch (ignore) {}
      try {
        db.s305000085.drop();
      } catch (ignore) {}
      try {
        db.s305000070.drop();
      } catch (ignore) {}
      try {
        db.s305000090.drop();
      } catch (ignore) {}

      //create main collections
      db._createDocumentCollection("UnitTestsPregelVertex1");
      db._createDocumentCollection("unittest_vertex2");
      db._createEdgeCollection("unittest_edge2");
      db._createEdgeCollection(ec1);

      db._create(globalCollectionName);

      //create result collections
      db._createDocumentCollection("P_305000077_RESULT_UnitTestsPregelVertex1");
      db._createDocumentCollection("P_305000077_RESULT_UnitTestsPregelVertex2");
      db._createEdgeCollection("P_305000077_RESULT_UnitTestsPregelEdge2");

      //create a dummy document for every collection
      firstDoc = db.UnitTestsPregelVertex1.save({
        text: "here is some random text",
        movies: ["matrix", "star wars", "harry potter"],
        sum: 1337,
        usable: true
      });

      secondDoc = db.unittest_vertex2.save({
        text: "here is some random text",
        movies: ["matrix", "star wars", "harry potter"],
        sum: 1338,
        usable: true
      });

      thirdDoc = db.UnitTestsPregelEdge2.save(firstDoc, secondDoc, {label: "hallo"});

      //create "shards"
      db._createDocumentCollection("s305000059");
      db._createDocumentCollection("s305000062");
      db._createDocumentCollection("s305000079");
      db._createDocumentCollection("s305000082");
      db._createDocumentCollection("s305000065");
      db._createDocumentCollection("s305000085");
      db._createEdgeCollection("s305000070");
      db._createEdgeCollection("s305000090");

      //fill global collection with mapping
      db[globalCollectionName].save({_key: "map", map: mapping});

    });

    afterEach(function () {
      db._drop(vc1);
      db._drop(ec1);
      db.unittest_vertex2.drop();
      db.unittest_edge2.drop();

      db._drop(globalCollectionName);

      db.P_305000077_RESULT_UnitTestsPregelVertex1.drop();
      db.P_305000077_RESULT_UnitTestsPregelVertex2.drop();
      db.P_305000077_RESULT_UnitTestsPregelEdge2.drop();

      db.s305000059.drop();
      db.s305000062.drop();
      db.s305000079.drop();
      db.s305000082.drop();
      db.s305000065.drop();
      db.s305000085.drop();
      db.s305000070.drop();
      db.s305000090.drop();
    });

    it("should create a vertex object", function () {

      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";
      db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue("UnitTestsPregelVertex1");

      var Vertex = new vertex(execNr, firstDoc._id);

      expect(Vertex._executionNumber).toEqual(execNr);
      expect(Vertex.text).toEqual("here is some random text");
      expect(Vertex.movies).toEqual(["matrix", "star wars", "harry potter"]);
      expect(Vertex.sum).toEqual(1337);
      expect(Vertex.usable).toEqual(true);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should mark the result of a vertex as deactivated", function () {
      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, resDoc._id);
      Vertex._deactivate();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.active).toBe(false);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should mark the result of a vertex as deleted", function () {
      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, resDoc._id);
      Vertex._delete();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.deleted).toBe(true);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should modify the _result attribute of the vertex", function () {
      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, resDoc._id);
      Vertex._result = {};
      Vertex._save();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.result).toEqual({});

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should get the _result attribute of the result collection", function () {
      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true, "result": "myResult"});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, resDoc._id);

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.result).toEqual(Vertex._result);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should get outEdges attribute correctly", function () {
      var docBefore = db.UnitTestsPregelEdge2.document(thirdDoc._id);
      var resName = "P_305000077_RESULT_UnitTestsPregelEdge2";
      var resDoc = db[resName].save(firstDoc, secondDoc, {myData: "Hello", _key: thirdDoc._key});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, resDoc._id);

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);

      var docAfter = db.UnitTestsPregelEdge2.document(thirdDoc._id);
      expect(docBefore).toEqual(docAfter);
      expect(Vertex._outEdges).toEqual([]);
    });


  });
});
