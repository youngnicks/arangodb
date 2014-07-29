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

describe("Pregel Vertex tests", function () {
  "use strict";

  describe("pregel vertex testing", function () {

    var mapping, v1, v2, e2, firstDoc, secondDoc,
    execNr = "unittest_nr_1337",
    shardName = "Pancho";

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

      try {
        db.UnitTestsPregelVertex1.drop();
        db.unittest_vertex2.drop();
        db.unittest_edge2.drop();

        db.global_unittest_nr_1337.drop();

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
      }
      catch (e) {
        //collection available
      }

      //create main collections
      db._createDocumentCollection("UnitTestsPregelVertex1");
      db._createDocumentCollection("unittest_vertex2");
      db._createEdgeCollection("unittest_edge2");

      //global collections
      try {
        db._createDocumentCollection("global_unittest_nr_1337");
      }
      catch (e) {
        //collection available
      }

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
      var globalCollectionName = pregel.genGlobalCollectionName(execNr);
      db[globalCollectionName].save({_key: "map", map: mapping});

    });

    afterEach(function () {
      db.UnitTestsPregelVertex1.drop();
      db.unittest_vertex2.drop();
      db.unittest_edge2.drop();

      db.global_unittest_nr_1337.drop();

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
    });

    it("should mark the result of a vertex as deactivated", function () {
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, firstDoc._id);
      db[resName].save({"_key": Vertex._key, "active": true});
      Vertex._deactivate();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.active).toBe(false);
    });

    it("should mark the result of a vertex as deleted", function () {
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, firstDoc._id);
      db[resName].save({"_key": Vertex._key, "deleted": false});
      Vertex._delete();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.deleted).toBe(true);
    });

    it("should return the result attribute of the result", function () {
      var resName = "P_305000077_RESULT_UnitTestsPregelVertex1";

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var myResult = {
        test: true,
        hallo: [123, 123, true, "false"],
        welt: {key: "asd"},
        number: 123123
      };

      var Vertex = new vertex(execNr, firstDoc._id);
      db[resName].save({"_key": Vertex._key, "result": myResult});

      Vertex._getResult();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.result).toEqual(myResult);
    });

  });
});
