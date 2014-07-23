/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments */

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

var db = require("internal").db;

var step = "step";
var stepContent = "stepContent";
var waitForAnswer = "waitForAnswer";
var active = "active";
var messages = "messages";


var getExecutionInfo = function(executionNumber) {
  var pregel = db._pregel;
  return pregel.document(executionNumber);
}

var updateExecutionInfo = function(executionNumber, infoObject) {
  var pregel = db._pregel;
  return pregel.update(executionNumber, infoObject);
}

var initNextStep = function(executionNumber) {
  var info = getExecutionInfo();
  info[step] = info[step]++;
  var isActive = info[active];


  var pregel = db._pregel;
  var info = pregel.document(executionNumber);
  db._pregel()
  /* TODO
  stepNr ++
  getInfo(exNr)
  if()active || messages {
  startNextStep
  else
  cleanUp
   */




  return undefined;
};

var startNextStep = function(executionNumber) {

  return undefined;
};

var cleanUp = function(executionNumber) {
  return undefined;
};

var startExecution = function(graphName, algorithm, options) {
  var executionNumber = "1";
  return executionNumber;
};

var getResult = function (executionNumber) {
  var resultingGraph = "graphName";
  return resultingGraph;
};


var getInfo = function(executionNumber) {

  return undefined;
};

var finishedStep = function(executionNumber, serverName, info) {

  return undefined;
};

// -----------------------------------------------------------------------------
// --SECTION--                                                    MODULE EXPORTS
// -----------------------------------------------------------------------------

// Public functions
exports.startExecution = startExecution;
exports.getResult = getResult;
exports.getInfo = getInfo;

// Internal functions
exports.finishedStep = finishedStep;
