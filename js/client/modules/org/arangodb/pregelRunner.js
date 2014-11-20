/*jshint strict: false */
/*global require, exports */

////////////////////////////////////////////////////////////////////////////////
/// @brief Graph functionality
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2010-2012 triagens GmbH, Cologne, Germany
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
/// @author Florian Bartels
/// @author Copyright 2011-2012, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var arangodb = require("org/arangodb"),
  PregelAPI = require("org/arangodb/pregel"),
  checkParameter = arangodb.checkParameter;


var Runner = function(execNumber) {
  if (execNumber) {
    this.executionNumber = execNumber;
  }
};


Runner.prototype.setWorker = function (worker) {
  checkParameter(
    "setWorker(function <worker>)",
    [ [ "Worker worker", "function" ]],
    [ worker] );

  this.worker = worker;
  return this;
};

Runner.prototype.setCombiner = function (combiner) {
  checkParameter(
    "setCombiner(function <combiner>)",
    [ [ "Combiner combiner", "function" ]],
    [ combiner] );
  this.combiner = combiner;
  return this;
};

Runner.prototype.setSuperstep = function (superstep) {
  checkParameter(
    "setSuperstep(function <superstep>)",
    [ [ "Superstep superstep", "function" ]],
    [ superstep] );
  this.superstep = superstep;
  return this;
};

Runner.prototype.setFinalstep = function (finalstep) {
  checkParameter(
    "setFinalstep(function <finalstep>)",
    [ [ "Finalstep finalstep", "function" ]],
    [ finalstep] );
  this.finalstep = finalstep;
  return this;
};

Runner.prototype.setGlobals = function (globals) {
  this.globals = globals;
  return this;
};

Runner.prototype.setGlobal = function (key, value) {
  this.globals = this.globals || {};
  this.globals[key] = value;
  return this;
};


Runner.prototype.getResult = function () {
  if (this.executionNumber) {
    return PregelAPI.getResult(this.executionNumber).result;
  }
};


Runner.prototype.getStatus = function () {
  if (this.executionNumber) {
    var state =  PregelAPI.getStatus(this.executionNumber);
    return {
      step : state.step,
      state : state.state
    };
  }
};


Runner.prototype.dropResult = function () {
  if (this.executionNumber) {
    return PregelAPI.dropResult(this.executionNumber);
  }
};


Runner.prototype.start = function (graphName) {
  if (this.hasOwnProperty("worker")) {
    this.executionNumber = PregelAPI.startExecution(
      graphName,  this.worker, this.superstep, this.combiner, this.globals
    ).executionNumber;
    return this.executionNumber;
  }
};

exports.Runner = Runner;

////////////////////////////////////////////////////////////////////////////////
/// @}
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
// --SECTION--                                                       END-OF-FILE
// -----------------------------------------------------------------------------

// Local Variables:
// mode: outline-minor
// outline-regexp: "^\\(/// @brief\\|/// @addtogroup\\|// --SECTION--\\|/// @page\\|/// @}\\)"
// End:

