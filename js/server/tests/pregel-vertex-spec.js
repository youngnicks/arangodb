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
var arangodb = require("org/arangodb");
var db = arangodb.db;
var graph = require("org/arangodb/general-graph");
var ArangoError = arangodb.ArangoError;
var ERRORS = arangodb.errors;
var vc1 = "UnitTestsPregelVertex1";
var vc2 = "UnitTestsPregelVertex2";
var ec1 = "UnitTestsPregelEdge2";
var coordinator = ArangoServerState.isCoordinator();


describe("Pregel Conductor", function () {
  "use strict";

  describe("reacting to DBServer calls", function () {

    var collections, v1, v2, e1;

    beforeEach(function () {
      collections = {
        "UnitTestsPregelVertex1" : {
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

        "UnitTestsPregelVertex2" : {
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

        "UnitTestsPregelEdge2" : {
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

      v1 = collections[0];
      v2 = collections[1];
      e1 = collections[2];

      db._createDocumentCollection("unittest_vertex1");
      db._createDocumentCollection("unittest_vertex2");
      db._createEdgeCollection("unittest_edge1");

    });

    afterEach(function () {
      db.unittest_vertex1.drop();
      db.unittest_vertex2.drop();
      db.unittest_edge1.drop();
    });

    it("should create a vertex object", function () {
      var Vertex = new vertex(123123, "123456789");
      expect(Vertex.active).toBe(true);
    });

    it("should deactivate a vertex object", function () {
      //var Vertex = new vertex(123123, "123456789");
      //Vertex._deactivate();
      //expect(Vertex.active).toBe(false);
    });

  });
});

