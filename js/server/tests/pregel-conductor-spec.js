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

describe("Pregel Conductor", function () {
  "use strict";

  describe("reacting to DBServer calls", function () {

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
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10 });
      var runDoc = db._pregel.document(execNr);
      expect(runDoc.waitForAnswer.length).toEqual(2);
      expect(runDoc.waitForAnswer.sort()).toEqual(["Pavel", "Pancho"].sort());
    });

    it("should update the step information", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10 });
      var runDoc = db._pregel.document(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step];
      expect(stepInfo.active).toEqual(30);
      expect(stepInfo.messages).toEqual(10);
    });



  });

});
