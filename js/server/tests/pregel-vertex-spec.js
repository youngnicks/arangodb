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
var vc1Res = "P_305000077_RESULT_UnitTestsPregelVertex1";
var vc2 = "UnitTestsPregelVertex2";
var vc2Res = "P_305000077_RESULT_UnitTestsPregelVertex2";
var ec1 = "UnitTestsPregelEdge2";
var ec1Res = "P_305000077_RESULT_UnitTestsPregelEdge2";
var coordinator = ArangoServerState.isCoordinator();

describe("Pregel Vertex Object Testing", function () {
  "use strict";

  describe("testing vertex methods", function () {

    var mapping, v1, v2, e2, firstDoc, secondDoc, thirdDoc,
      execNr = "unittest_nr_1337";
    var globalCollectionName = pregel.genGlobalCollectionName(execNr);

    beforeEach(function () {
      mapping = {};
      mapping[vc1] = {
        type: 2,
        resultCollection: vc1Res,
        originalShards: {},
        resultShards: {}
      };
      mapping[vc1].originalShards[vc1] = "localhost";
      mapping[vc1].resultShards[vc1Res] = "localhost";
      mapping[vc2] = {
        type: 2,
        resultCollection: vc2Res,
        originalShards: {},
        resultShards: {}
      };
      mapping[vc2].originalShards[vc2] = "localhost";
      mapping[vc2].resultShards[vc2Res] = "localhost";
      mapping[ec1] = {
        type: 3,
        resultCollection: ec1Res,
        originalShards: {},
        resultShards: {}
      };
      mapping[ec1].originalShards[ec1] = "localhost";
      mapping[ec1].resultShards[ec1Res] = "localhost";

      v1 = mapping[vc1];
      v2 = mapping[vc2];
      e2 = mapping[ec1];

      db._drop(vc1);
      db._drop(vc2);
      db._drop(ec1);
      db._drop(vc1Res);
      db._drop(vc2Res);
      db._drop(ec1Res);
      db._drop(globalCollectionName);

      db._create(vc1);
      db._create(vc2);
      db._createEdgeCollection(ec1);
      db._create(vc1Res);
      db._create(vc2Res);
      db._createEdgeCollection(ec1Res);

      db._create(globalCollectionName);

      //create a dummy document for every collection
      firstDoc = db[vc1].save({
        text: "here is some random text",
        movies: ["matrix", "star wars", "harry potter"],
        sum: 1337,
        usable: true
      });

      secondDoc = db[vc2].save({
        text: "here is some random text",
        movies: ["matrix", "star wars", "harry potter"],
        sum: 1338,
        usable: true
      });

      thirdDoc = db.UnitTestsPregelEdge2.save(firstDoc._id, secondDoc._id, {label: "hallo"});

      //fill global collection with mapping
      db[globalCollectionName].save({_key: "map", map: mapping});

    });

    afterEach(function () {
      db._drop(vc1);
      db._drop(vc2);
      db._drop(ec1);
      db._drop(vc1Res);
      db._drop(vc2Res);
      db._drop(ec1Res);
      db._drop(globalCollectionName);
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

      var Vertex = new vertex(execNr, {
        _id: firstDoc._id,
        shard: vc1Res
      });

      expect(Vertex._executionNumber).toEqual(execNr);
      expect(Vertex.text).toEqual("here is some random text");
      expect(Vertex.movies).toEqual(["matrix", "star wars", "harry potter"]);
      expect(Vertex.sum).toEqual(1337);
      expect(Vertex.usable).toEqual(true);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should mark the result of a vertex as deactivated", function () {
      var docBefore = db[vc1].document(firstDoc._id);
      var resName = vc1Res;
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, {
        _id: resDoc._id,
        shard: resName
      });
      Vertex._deactivate();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.active).toBe(false);

      var docAfter = db[vc1].document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should mark the result of a vertex as deleted", function () {
      var docBefore = db[vc1].document(firstDoc._id);
      var resName = vc1Res;
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, {
        _id: resDoc._id,
        shard: resName
      });
      Vertex._delete();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.deleted).toBe(true);

      var docAfter = db[vc1].document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should modify the _result attribute of the vertex", function () {
      var docBefore = db[vc1].document(firstDoc._id);
      var resName = vc1Res;
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, {
        _id: resDoc._id,
        shard: vc1Res
      });
      Vertex._result = {};
      Vertex._save();

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.result).toEqual({});

      var docAfter = db[vc1].document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should get the _result attribute of the result collection", function () {
      var docBefore = db.UnitTestsPregelVertex1.document(firstDoc._id);
      var resName = vc1Res;
      var resDoc = db[resName].save({"_key": firstDoc._key, "active": true, "result": "myResult"});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, {
        _id: resDoc._id,
        shard: vc1Res
      });

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);
      expect(resultDocument.result).toEqual(Vertex._result);

      var docAfter = db.UnitTestsPregelVertex1.document(firstDoc._id);
      expect(docBefore).toEqual(docAfter);
    });

    it("should get outEdges attribute correctly", function () {
      var docBefore = db[ec1].document(thirdDoc._id);
      var resName = ec1Res;
      var resDoc = db[resName].save(firstDoc, secondDoc, {myData: "Hello", _key: thirdDoc._key});

      if (!ArangoClusterInfo.getResponsibleShard) {
        ArangoClusterInfo.getResponsibleShard = function () {
          return undefined;
        };
      }
      spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(resName);

      var Vertex = new vertex(execNr, {
        _id: resDoc._id,
        shard: resName
      });

      var resultDocument = db[resName].document(resName + "/" + Vertex._key);

      var docAfter = db.UnitTestsPregelEdge2.document(thirdDoc._id);
      expect(docBefore).toEqual(docAfter);
      expect(Vertex._outEdges).toEqual([]);
    });


  });
});
