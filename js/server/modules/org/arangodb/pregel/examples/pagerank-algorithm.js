/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel implementation of the pagerank algorithm
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
/// @author Michael Hackstein
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var pageRank = function (vertex, message, global) {
  var total = global.vertexCount;
  var edgeCount;
  var send;
  if (global.step === 0) {
    edgeCount = vertex._outEdges.length;
    var initPR = 1 / total;
    vertex._setResult({
      rank: initPR,
      edgeCount: edgeCount
    });
    send = initPR / edgeCount;
    vertex._outEdges.forEach(function (e) {
      message.sendTo(e._targetVertex, send, false);
    });
    return;
  }
  var result = vertex._getResult();
  edgeCount = result.edgeCount;
  var alpha = global.alpha;
  var newPR = 0;
  var next;
  while (message.hasNext()) {
    next = message.next();
    newPR += next.data;
  }
  newPR *= alpha;
  newPR += (1 - alpha) / total;
  result.rank = newPR;
  vertex._setResult(result);
  if (global.step === 30) {
    vertex._deactivate();
    return;
  }
  send = newPR / edgeCount;
  vertex._outEdges.forEach(function (e) {
    message.sendTo(e._targetVertex, send, false);
  });
};

var aggregator = function (message, oldMessage) {
  return message + oldMessage;
};

var getAlgorithm = function () {
  return {
    base: pageRank.toString(),
    aggregator: aggregator.toString()
  }
};

exports.getAlgorithm = getAlgorithm;
