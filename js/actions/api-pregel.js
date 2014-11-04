/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require*/
////////////////////////////////////////////////////////////////////////////////
/// @brief Graph functionality
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
/// @author Florian Bartels, Michael Hackstein, Guido Schwab
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var actions = require("org/arangodb/actions");
var executionNumber = "executionNumber";

////////////////////////////////////////////////////////////////////////////////
/// @brief handle post requests
////////////////////////////////////////////////////////////////////////////////

function post_pregel (req, res) {
  'use strict';
  var pregel = require("org/arangodb/pregel");
  var worker = pregel.Worker;
  var conductor = pregel.Conductor;

  var body;
  switch (req.suffix[0]) {
    case ("cleanup") :
      if (!req.suffix[1]) {
        actions.badParameter (req, res, executionNumber);
        return;
      }
      worker.cleanUp(req.suffix[1]);
      actions.resultOk(req, res, actions.HTTP_OK);
      break;

    case ("finishedCleanup") :
      body = JSON.parse(req.requestBody);
      conductor.finishedCleanUp(
        body.executionNumber,
        body.server
      );
      actions.resultOk(req, res, actions.HTTP_OK);
      break;

    case ("finishedStep") :
      body = JSON.parse(req.requestBody);
      conductor.finishedStep(
        body.executionNumber,
        body.server,
        {
          step : body.step,
          messages : body.messages,
          active : body.active,
          error: body.error,
          final: body.final,
          data: body.data
        }
      );
      actions.resultOk(req, res, actions.HTTP_OK);
      break;

    case ("nextStep") :
      body = JSON.parse(req.requestBody);
      worker.executeStep(body.executionNumber, body.step, body.setup, body.globals);
      actions.resultOk(req, res, actions.HTTP_OK);
      break;

    case ("startExecution") :
      body = JSON.parse(req.requestBody);
      var algorithms = {};
      algorithms.base = body.pregelAlgorithm;
      if (body.hasOwnProperty("conductorAlgorithm")) {
        algorithms.superstep = body.conductorAlgorithm;
      }
      if (body.hasOwnProperty("combiner")) {
        algorithms.combiner = body.combiner;
      }
      var result = conductor.startExecution(
        body.graphName, algorithms, body.options
      );
      actions.resultOk(req, res, actions.HTTP_OK, {executionNumber : result});
      break;

      case ("message") :
        body = JSON.parse(req.requestBody);
        worker.receiveMessages(
          body.execNr,
          body.shard,
          body.step,
          body.sender,
          body.worker,
          body.msg
        );
        actions.resultOk(req, res, actions.HTTP_OK);
      break;

      case "dropResult" :
        if (!req.suffix[1]) {
          actions.badParameter (req, res, executionNumber);
          return;
        }
        conductor.dropResult(req.suffix[1]);
        actions.resultOk(req, res, actions.HTTP_OK);
      break;

    default:
      actions.resultUnsupported(req, res);
  }
}



////////////////////////////////////////////////////////////////////////////////
/// @brief handle get requests
////////////////////////////////////////////////////////////////////////////////

function get_pregel (req, res) {
  'use strict';
  var pregel = require("org/arangodb/pregel");
  var conductor = pregel.Conductor;
  var result;

  switch (req.suffix[0]) {
    case "result" :
      result = conductor.getResult(req.suffix[1]);
      actions.resultOk(req, res, actions.HTTP_OK, result);
      break;
    case "status" :
      result = conductor.getInfo(req.suffix[1]);
      actions.resultOk(req, res, actions.HTTP_OK, result);
      break;

    default:
      actions.resultUnsupported(req, res);
  }
}


actions.defineHttp({
  url : "_api/pregel",
  context : "api",
  prefix : true,
  callback : function (req, res) {
    'use strict';
    try {
       if (req.requestType === actions.POST) {
        post_pregel(req, res);
       } else if (req.requestType === actions.GET) {
         get_pregel(req, res);
       } else {
        actions.resultUnsupported(req, res);
      }
    }
    catch (err) {
      actions.resultException(req, res, err, undefined, false);
    }
  }
});
