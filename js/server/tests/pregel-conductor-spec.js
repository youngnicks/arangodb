/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach */

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
var db = require("org/arangodb").db;
var arangodb = require("org/arangodb");
var graph = require("org/arangodb/general-graph");
var ArangoError = arangodb.ArangoError;
var ERRORS = arangodb.errors;

describe("Pregel Conductor", function () {
  "use strict";

  describe("reacting to DBServer calls", function () {

    var execNr, dbServer;

    beforeEach(function () {
      execNr = "UnitTestPregel";
      dbServer = "Pjotr";
      try {
        db._collection("_pregel").remove(execNr);
      } catch (ignore) {
        // Has already been removed
      }
      db._collection("_pregel").save({
        _key: execNr,
        step: 1,
        stepContent: [
          {
            active: 100,
            messages: 0
          },
          {
            active: 20,
            messages: 5
          }
        ],
        waitForAnswer: [
          "Pavel",
          dbServer,
          "Pancho"
        ]
      });
    });

    afterEach(function () {
      db._collection("_pregel").remove(execNr);
    });

    it("should remove the reporting server from the awaited list", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = db._pregel.document(execNr);
      expect(runDoc.waitForAnswer.length).toEqual(2);
      expect(runDoc.waitForAnswer.sort()).toEqual(["Pavel", "Pancho"].sort());
    });

    it("should update the step information", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = db._pregel.document(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step];
      expect(stepInfo.active).toEqual(30);
      expect(stepInfo.messages).toEqual(10);
    });

    it("should throw an error if the server calling back is not awaited", function () {
      try {
        conductor.finishedStep(execNr, "unkownServer", { messages: 5, active: 10, step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code);
        expect(e.errMessage).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.message);
      }
    });

    it("should throw an error if the message is malformed", function () {
      try {
        conductor.finishedStep(execNr, dbServer, { step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code);
        expect(e.errMessage).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.message);
      }
    });

    it("should throw an error if a false step number is sent", function () {
      try {
        conductor.finishedStep(execNr, dbServer, { step: 3, message: 5, active: 10 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.code);
        expect(e.errMessage).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.message);
      }
    });

  });

  describe("reacting to last server call", function () {
    var execNr, dbServer;

    beforeEach(function () {
      execNr = "UnitTestPregel";
      dbServer = "Pjotr";
      db._collection("_pregel").save({
        _key: execNr,
        step: 1,
        stepContent: [
          {
            active: 100,
            messages: 0
          },
          {
            active: 20,
            messages: 5
          }
        ],
        waitForAnswer: [
          dbServer
        ]
      });
    });

    afterEach(function () {
      db._collection("_pregel").remove(execNr);
    });


  });

  describe("start execution", function () {

    beforeEach(function () {
      try {
        graph._drop("bla3", true);
      } catch (err) {
      }
      var vc1 = "UnitTestsAhuacatlVertex1";
      var vc2 = "UnitTestsAhuacatlVertex2";
      var ec1 = "UnitTestsAhuacatlEdge2";
      try {
        require("internal").print(Object.keys(db._pregel));
        db._pregel.truncate();
      } catch (err) {
        require("internal").print(err);
      }
      db._drop(vc1);
      db._drop(vc2);
      db._drop(ec1);
      if (ArangoServerState.isCoordinator()) {
        require("internal").print("i am a coordinator");
        var vertex1 = db._create(vc1 , {numberOfShards : 4});
        var vertex2 = db._create(vc2, {numberOfShards : 4});
        var edge2 = db._createEdgeCollection(ec1, {numberOfShards : 4});
      } else {
        require("internal").print("i am NO coordinator");
        var vertex1 = db._create(vc1);
        var vertex2 = db._create(vc2);
        var edge2 = db._createEdgeCollection(ec1);
      }
      vertex1.save({ _key: "v1", hugo: true});
      vertex1.save({ _key: "v2", hugo: true});
      vertex2.save({ _key: "v3", heinz: 1});
      vertex2.save({ _key: "v4" });

      function makeEdge(from, to, collection) {
        collection.save(from, to, { what: from.split("/")[1] + "->" + to.split("/")[1] });
      }

      makeEdge(vc1 + "/v1", vc2 + "/v3", edge2);
      makeEdge(vc1 + "/v1", vc2 + "/v4", edge2);
      makeEdge(vc1 + "/v2", vc2 + "/v3", edge2);
      graph._create(
        "bla3",
        graph._edgeDefinitions(
          graph._directedRelation(ec1,
            [vc1],
            [vc2]
          )
        )
      );
    });

    afterEach(function () {
      graph._drop("bla3", true);
    });

    it("should start execution", function () {
      conductor.startExecution("bla3", "algorithm");
      //expect(db._pregel.toArray().length).toEqual(1);
      //expect(db._pregel.toArray()[1].step).toEqual(0);
      //expect(db._pregel.toArray()[1].stepContent[0].active).toEqual(4);
      //var id = db._pregel.toArray()[1]._key;
      //expect(db["P_" + id + "_RESULT_" + vc1]).not.toEqual(undefined);
      //expect(db["P_" + id + "_RESULT_" + vc3]).not.toEqual(undefined);
      //expect(db["P_" + id + "_RESULT_" + vc2]).not.toEqual(undefined);


    });

  });
});
