/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel implementation of the graph coloring algorithm
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
/// @author Florian Bartels
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var graphColoring = function (vertex, message, global) {
  var next, color = "#25262a";
  if (global.color) {
    color = global.color;
  }
  if (global.step > 152) {
    vertex._delete();
    return;
  }

  var PHASE_PRE_INITIALIZATION = "1";
  var PHASE_INITIALIZATION = "2";
  var PHASE_CONFLICT_RESOLUTION = "3";
  var NOT_IN_S_AND_DEGREE_ADJUSTING1 = "4";

  var STATE_UNKNOWN = 1;
  var STATE_TENTATIVELY_IN = 2;
  var STATE_IN = 3;
  var NOT_IN = 4;

  var MSG_NEIGHBOR = 1;
  var MSG_DECREMENT = 2;
  var MSG_CONTACT = 3;
  var MSG_TIS = 4

  var result = vertex._getResult() || {};
  if (global.retype === true) {
    result.type = STATE_UNKNOWN;
  }

  switch (result.phase) {
    case PHASE_PRE_INITIALIZATION:
      if (result.type !== STATE_UNKNOWN) {
        vertex._deactivate();
        return;
      }
      result.phase = PHASE_INITIALIZATION;
      if (result.degree === undefined) {
        while (message.hasNext()) {
          next = message.next();
          if (Object.keys(result.neighbors).indexOf(JSON.stringify(next.sender)) === -1) {
            result.neighbors[JSON.stringify(next.sender)] = next.sender;
          }
        }
        result.degree = Object.keys(result.neighbors).length;
      }
      var random = Math.random();
      if (1.0 / (2 * result.degree) <= random || result.degree === 0) {
        result.type = STATE_TENTATIVELY_IN;
        Object.keys(result.neighbors).forEach(function (e) {
          message.sendTo(result.neighbors[e], {id: vertex._get("_id"), msg: MSG_TIS, degree: result.degree});
        });
      }
      break;


    case PHASE_INITIALIZATION:
      result.phase = PHASE_CONFLICT_RESOLUTION;
      if (result.type === STATE_TENTATIVELY_IN) {
        var isInS = true;
        while (message.hasNext()) {
          next = message.next();
          if (next.data.degree < result.degree ||
            (next.data.degree === result.degree &&
              [vertex._get("_id"), next.data.id].sort()[0] !== vertex._get("_id")
              )
            ) {
            isInS = false;
            break;
          }
        }
        if (isInS) {
          result.type = STATE_IN;
          result.color = color;
          Object.keys(result.neighbors).forEach(function (e) {
            message.sendTo(
              result.neighbors[e],
              {msg: MSG_NEIGHBOR, lI: JSON.stringify(vertex._getLocationInfo())}
            );
          });
          vertex._delete();
        } else {
          result.type = STATE_UNKNOWN;
        }
      }

      break;


    case PHASE_CONFLICT_RESOLUTION:
      result.phase = NOT_IN_S_AND_DEGREE_ADJUSTING1;
      while (message.hasNext()) {
        next = message.next();
        if (next.data.msg === MSG_NEIGHBOR) {
          result.type = NOT_IN;
          delete result.neighbors[next.data.lI];
        }
      }
      if (result.type === NOT_IN) {
        Object.keys(result.neighbors).forEach(function (e) {
          message.sendTo(
            result.neighbors[e],
            {msg: MSG_DECREMENT}
          );
        });
        result.phase = PHASE_PRE_INITIALIZATION;
        vertex._deactivate();
      }
      break;


    case NOT_IN_S_AND_DEGREE_ADJUSTING1:
      result.phase = PHASE_PRE_INITIALIZATION;
      if (result.type === STATE_UNKNOWN) {
        while (message.hasNext()) {
          next = message.next();
          result.degree = result.degree - 1;
        }
      } else {
        vertex._deactivate();
      }

      break;


    default:
      result = {
        type: STATE_UNKNOWN,
        neighbors: {},
        phase: PHASE_PRE_INITIALIZATION
      };
      while (vertex._outEdges.hasNext()) {
        e = vertex._outEdges.next();
        result.neighbors[JSON.stringify(e._getTarget())] = e._getTarget();
        message.sendTo(e._getTarget(), {msg: MSG_CONTACT});
      }
  }
  vertex._setResult(result);
  if (global.retype === true) {
    result.type = STATE_UNKNOWN;
  }
};


var conductorAlgorithm = function (globals, stepInfo) {
  if (!globals.usedColors) {
    globals.usedColors = ['#25262a'];
  }

  var newColor = '#25262a';
  if (!stepInfo.final) {
    globals.retype = false
  }

  if (stepInfo.active === 0 && stepInfo.messages === 0) {
    globals.retype = true;
    while (globals.usedColors.indexOf(newColor) !== -1) {
      newColor = '#' + Math.random().toString(16).substring(2, 8);
    }
    globals.usedColors.push(newColor);
    globals.color = newColor;
  }
};

var finalAlgorithm = function (vertex, message, global) {
  var result = vertex._getResult();
  if (result.type === 4) {
    vertex._activate();
  }
};

var getAlgorithm = function () {
  return {
    base  : graphColoring.toString(),
    final : finalAlgorithm.toString(),
    superstep : conductorAlgorithm.toString()
  }
}


exports.getAlgorithm = getAlgorithm;