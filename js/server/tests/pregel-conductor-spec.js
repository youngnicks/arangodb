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
var db = require("internal").db;
var arangodb = require("org/arangodb");
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
        conductor.finishedStep(conductor, execNr, "unkownServer", { messages: 5, active: 10, step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code);
        expect(e.errMessage).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.message);
      }
    });

    it("should throw an error if the message is malformed", function () {
      try {
        conductor.finishedStep(conductor, execNr, dbServer, { step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code);
        expect(e.errMessage).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.message);
      }
    });

    it("should throw an error if a false step number is sent", function () {
      try {
        conductor.finishedStep(conductor, execNr, dbServer, { step: 3, message: 5, active: 10 });
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

});
