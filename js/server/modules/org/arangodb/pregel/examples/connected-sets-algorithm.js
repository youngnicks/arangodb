/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global exports*/

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel implementation of the graph connected sets algorithm
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

var connectedSets = function (vertex, message, global) {
  'use strict';
  var next, changed = false, result, sendSender = false, edge, i;

  switch (global.step) {
  case 0:
    result = {
      value: vertex._get("_key"),
      backwards: []
    };
    sendSender = true;
    break;
  case 1:
    result = vertex._getResult();
    while (message.hasNext()) {
      next = message.next();
      if (result.value < next.data) {
        result.value = next.data;
      }
      result.backwards.push(next.sender);
    }
    break;
  default:
    result = vertex._getResult();
    while (message.hasNext()) {
      next = message.next();
      if (result.value < next.data) {
        result.value = next.data;
        changed = true;
      }
    }
  }
  if (global.step > 1 && !changed) {
    vertex._deactivate();
    return;
  }
  vertex._setResult(result);
  while (vertex._outEdges.hasNext()) {
    edge = vertex._outEdges.next();
    message.sendTo(edge._getTarget(), result.value, sendSender);
  }
  for (i = 0; i < result.backwards.length; ++i) {
    message.sendTo(result.backwards[i], result.value, sendSender);
  }
  vertex._deactivate();
};


var combiner = function (next, old) {
  'use strict';
  if (old === null || next < old) {
    return next;
  }
  return old;
};

var getAlgorithm = function () {
  'use strict';
  return {
    base  : connectedSets.toString(),
    combiner : combiner.toString()
  };
};

exports.getAlgorithm = getAlgorithm;
