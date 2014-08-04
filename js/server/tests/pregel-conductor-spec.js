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
var arangodb = require("org/arangodb");
var db = arangodb.db;
var graph = require("org/arangodb/general-graph");
var ArangoError = arangodb.ArangoError;
var ERRORS = arangodb.errors;
var vc1 = "UnitTestsPregelVertex1";
var vc2 = "UnitTestsPregelVertex2";
var ec1 = "UnitTestsPregelEdge2";
var coordinator = ArangoServerState.isCoordinator();


var getRunInfo = function (execNr) {
  "use strict";
  return db._pregel.document(execNr);
};

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
          },
          {
            active: 5,
            messages: 2
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
      var runDoc = getRunInfo(execNr);
      expect(runDoc.waitForAnswer.length).toEqual(2);
      expect(runDoc.waitForAnswer.sort()).toEqual(["Pavel", "Pancho"].sort());
    });

    it("should update the step information for the next step", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = getRunInfo(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step + 1];
      expect(stepInfo.active).toEqual(15);
      expect(stepInfo.messages).toEqual(7);
    });

    it("should not overwrite the current step information", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = getRunInfo(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step];
      expect(stepInfo.active).toEqual(20);
      expect(stepInfo.messages).toEqual(5);
    });

    it("should throw an error if the server calling back is not awaited", function () {
      try {
        conductor.finishedStep(execNr, "unkownServer", { messages: 5, active: 10, step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errorNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_SERVER_NAME_MISMATCH.code);
      }
    });

    it("should throw an error if the message is malformed", function () {
      try {
        conductor.finishedStep(execNr, dbServer, { step: 1 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errorNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_MALFORMED.code);
      }
    });

    it("should throw an error if a false step number is sent", function () {
      try {
        conductor.finishedStep(execNr, dbServer, { step: 3, message: 5, active: 10 });
        this.fail(Error("should never be reached"));
      } catch (e) {
        expect(e instanceof ArangoError).toBeTruthy();
        expect(e.errorNum).toEqual(ERRORS.ERROR_PREGEL_MESSAGE_STEP_MISMATCH.code);
      }
    });

  });

  describe("reacting to last server call", function () {
    var execNr, dbServer, clusterServer;

    beforeEach(function () {
      execNr = "UnitTestPregel";
      dbServer = "Pjotr";
      if (coordinator) {
        clusterServer = ["Pavel", "Pancho", "Pjotr"];
        spyOn(ArangoClusterInfo, "getDBServers").and.returnValue(clusterServer);
        spyOn(ArangoClusterComm, "asyncRequest");
      } else {
        clusterServer = ["localhost"];
        spyOn(worker, "executeStep");
      }
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
            active: 30,
            messages: 10
          },
          {
            active: 0,
            messages: 0
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

    it("should update the step number", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = getRunInfo(execNr);
      expect(runDoc.step).toEqual(2);
    });

    it("should use the next step content", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = getRunInfo(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step];
      expect(stepInfo.active).toEqual(10);
      expect(stepInfo.messages).toEqual(5);
    });

    it("should create the step content for the after next step", function () {
      conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
      var runDoc = getRunInfo(execNr);
      var stepInfo = runDoc.stepContent[runDoc.step + 1];
      expect(stepInfo.active).toEqual(0);
      expect(stepInfo.messages).toEqual(0);
    });

    if (coordinator) {

      it("should call next pregel execution on all database servers", function () {
        var body = JSON.stringify({step: 2, executionNumber: execNr, setup: {}, conductor: ArangoServerState.id()});
        conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
        clusterServer.forEach(function (server) {
          expect(ArangoClusterComm.asyncRequest).toHaveBeenCalledWith(
            "POST",
            "server:" + server,
            db._name(),
            "/_api/pregel",
            body,
            {},
            {}
          );
        });
      });

    } else {

      it("should call next pregel execution locally", function () {
        conductor.finishedStep(execNr, dbServer, { messages: 5, active: 10, step: 1 });
        expect(worker.executeStep).toHaveBeenCalledWith(execNr, 2, {
          conductor: "localhost"
        });
      });

    }

  });

  describe("using a graph", function () {

    var graphName = "UnitTestPregelGraph";
    var clusterServer;

    beforeEach(function () {
      try {
        graph._drop(graphName, true);
      } catch (ignore) {
      }

      db._pregel.truncate();
      db._drop(vc1);
      db._drop(vc2);
      db._drop(ec1);
      var vertex1;
      var vertex2;
      var edge2;
      if (coordinator) {
        vertex1 = db._create(vc1, {numberOfShards : 4});
        vertex2 = db._create(vc2, {numberOfShards : 4});
        edge2 = db._createEdgeCollection(ec1, {numberOfShards : 4});
      } else {
        vertex1 = db._create(vc1);
        vertex2 = db._create(vc2);
        edge2 = db._createEdgeCollection(ec1);
      }
      vertex1.save({ _key: "v1", hugo: true});
      vertex1.save({ _key: "v2", hugo: true});
      vertex2.save({ _key: "v3", heinz: 1});
      vertex2.save({ _key: "v4" });

      var makeEdge = function (from, to, collection) {
        collection.save(from, to, { what: from.split("/")[1] + "->" + to.split("/")[1] });
      };

      makeEdge(vc1 + "/v1", vc2 + "/v3", edge2);
      makeEdge(vc1 + "/v1", vc2 + "/v4", edge2);
      makeEdge(vc1 + "/v2", vc2 + "/v3", edge2);
      graph._create(
        graphName,
        graph._edgeDefinitions(
          graph._directedRelation(
            ec1,
            [vc1],
            [vc2]
          )
        )
      );
    });

    describe("start execution", function () {

      beforeEach(function () {
        if (coordinator) {
          clusterServer = ["Pavel", "Pancho", "Pjotr"];
          spyOn(ArangoClusterInfo, "getDBServers").and.returnValue(clusterServer);
          var asyncRequest = ArangoClusterComm.asyncRequest;
          spyOn(ArangoClusterComm, "asyncRequest").and.callFake(function (a, b, c, endpoint, d, e, f) {
            if (endpoint.indexOf("_api/pregel") === -1) {
              asyncRequest(a, b, c, endpoint, d, e, f);
            }
          });
        } else {
          spyOn(worker, "executeStep");
          clusterServer = ["localhost"];
        }
      });

      afterEach(function () {
        graph._drop(graphName, true);
      });

      it("should start execution", function () {
        conductor.startExecution(graphName, "function(){}");
        expect(db._pregel.toArray().length).toEqual(1);
        expect(db._pregel.toArray()[0].step).toEqual(0);
        expect(db._pregel.toArray()[0].stepContent[0].active).toEqual(4);
        var id = db._pregel.toArray()[0]._key;
        expect(db["P_" + id + "_RESULT_" + vc1]).not.toEqual(undefined);
        expect(db["P_" + id + "_RESULT_" + vc2]).not.toEqual(undefined);
        expect(db._graphs.document("P_" + id + "_RESULT_" + graphName)).not.toEqual(undefined);
      });

      it("should start execution and finish steps", function () {
        conductor.startExecution(graphName, "function(){}");
        expect(db._pregel.toArray().length).toEqual(1);
        expect(db._pregel.toArray()[0].step).toEqual(0);
        expect(db._pregel.toArray()[0].stepContent[0].active).toEqual(4);
        var id = db._pregel.toArray()[0]._key;
        expect(db["P_" + id + "_RESULT_" + vc1]).not.toEqual(undefined);
        expect(db["P_" + id + "_RESULT_" + vc2]).not.toEqual(undefined);
        expect(db._graphs.document("P_" + id + "_RESULT_" + graphName)).not.toEqual(undefined);
        db._pregel.toArray()[0].waitForAnswer.forEach(function (dbserv) {
          conductor.finishedStep(id, dbserv, {step : 0, messages : 0, active : 0});
        });
      });
    });

    describe("executing a complete successful game", function () {

      var sendAnswer;
      var execNr;
      var counter;

      beforeEach(function () {
        execNr = false;
        counter = {};
        sendAnswer = function (server, body) {
          if (!execNr) {
            execNr = body.executionNumber;
          }
          expect(execNr).toEqual(body.executionNumber);
          var info = {
            step: body.step,
            messages: 2,
            active: 5
          };
          if (body.step === 3) {
            info.messages = 0;
            info.active = 0;
          }
          counter[server]++;
          conductor.finishedStep(execNr, server, info);
        };
        if (coordinator) {
          clusterServer = ["Pavel", "Paolo", "Pjotr"];
          spyOn(ArangoClusterInfo, "getDBServers").and.returnValue(clusterServer);
          var asyncRequest = ArangoClusterComm.asyncRequest;
          spyOn(ArangoClusterComm, "asyncRequest").and.callFake(function (a, target, c, endpoint, body, e, f) {
            if (endpoint.indexOf("_api/pregel") === -1) {
              asyncRequest(a, target, c, endpoint, body, e, f);
            } else {
              var server = target.split(":")[1];
              if (endpoint.indexOf("cleanup") === -1) {
                sendAnswer(server, JSON.parse(body));
              }
            }
          });
        } else {
          clusterServer = ["localhost"];
          spyOn(worker, "executeStep").and.callFake(function (executionNumber, step) {
            if (!execNr) {
              execNr = executionNumber;
            }
            expect(execNr).toEqual(executionNumber);
            var server = "localhost";
            counter[server]++;
            var info = {
              step: step,
              messages: 2,
              active: 5
            };
            if (step === 3) {
              info.messages = 0;
              info.active = 0;
            }
            conductor.finishedStep(executionNumber, server, info);
          });
        }
        clusterServer.forEach(function (s) {
          counter[s] = 0;
        });
        conductor.startExecution(graphName, "function(){}");
      });

      afterEach(function () {
        if (execNr) {
          db._collection("_pregel").remove(execNr);
        }
      });

      it("should return the resulting graph name", function () {
        expect(conductor.getResult(execNr).graphName).toEqual("P_" + execNr + "_RESULT_" + graphName);
      });

      it("should return finished execution state", function () {
        expect(conductor.getInfo(execNr).state).toEqual("finished");
      });

      it("should call all servers equally often", function () {
        clusterServer.forEach(function (s) {
          expect(counter[s]).toEqual(4);
        });
      });

    });

  });

});
