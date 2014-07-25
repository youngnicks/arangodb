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
        var body = JSON.stringify({step: 2, executionNumber: execNr, setup: {}});
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
        expect(false).toBeTruthy();
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
          clusterServer = ["localhost"];
        }
      });

      afterEach(function () {
        graph._drop(graphName, true);
      });

      it("should start execution", function () {
        conductor.startExecution(graphName, "algorithm");
        expect(db._pregel.toArray().length).toEqual(1);
        expect(db._pregel.toArray()[0].step).toEqual(0);
        expect(db._pregel.toArray()[0].stepContent[0].active).toEqual(4);
        var id = db._pregel.toArray()[0]._key;
        expect(db["P_" + id + "_RESULT_" + vc1]).not.toEqual(undefined);
        expect(db["P_" + id + "_RESULT_" + vc2]).not.toEqual(undefined);
        expect(db._graphs.document("P_" + id + "_RESULT_" + graphName)).not.toEqual(undefined);
      });

      it("should start execution and finish steps", function () {
        conductor.startExecution(graphName, "algorithm");
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

    describe("executing a complete game", function () {

      var sendAnswer;
      var execNr;

      beforeEach(function () {
        if (coordinator) {
          clusterServer = ["Pavel", "Pancho", "Pjotr"];
          spyOn(ArangoClusterInfo, "getDBServers").and.returnValue(clusterServer);
          var asyncRequest = ArangoClusterComm.asyncRequest;
          spyOn(ArangoClusterComm, "asyncRequest").and.callFake(function (a, target, c, endpoint, body, e, f) {
            if (endpoint.indexOf("_api/pregel") === -1) {
              asyncRequest(a, target, c, endpoint, body, e, f);
            } else {
              var server = target.split(":")[1];
              sendAnswer(server, JSON.parse(body));
            }
          });
        } else {
          clusterServer = ["localhost"];
        }
      });

      afterEach(function () {
        db._collection("_pregel").remove(execNr);
      });

      describe("in a case without error", function () {

        var tasks = require("org/arangodb/tasks");

        beforeEach(function (done) {
          sendAnswer = function (server, body) {
            var info = {
              step: body.step,
              messages: 2,
              active: 5
            };
            if (body.step === 3) {
              info.messages = 0;
              info.active = 0;
            }
            require("internal").wait(10);
            tasks.register({
              id: server + "::" + body.step,
              name: server + "step answer",
              offset: 10,
              command: function (params) {
                var e = params.execNr;
                var s = params.server;
                var i = params.info;
                require("org/arangodb/pregel").conductor.finishedStep(e, s, i);
              },
              params: {
                execNr: execNr,
                server: server,
                info: info
              }
            });
          };
          execNr = conductor.startExecution(graphName, "algorithm");
          require("console").log(execNr);
          require("internal").wait(2000);
          require("console").log("Waited");
          done();
        });

        it("should return the resulting graph name", function () {
          expect(conductor.getResult(execNr)).toEqual("P_" + execNr + "_RESULT_" + graphName);
        });

        it("should return finished execution state", function () {
          expect(conductor.getInfo(execNr).state).toEqual("finished");
        });
      });

    });

  });

});
