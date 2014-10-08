/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel implementation of the burovka algorithm
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

var boruvka = function (vertex, message, global) {
  //require("internal").print(global)

  _ = require("underscore");
  var distanceAttrib = global.distance;
  var TYPE_UNKNOWN = "1";
  var TYPE_SUPERVERTEX = "2";
  var TYPE_POINTS_AT_SUPERVERTEX = "3";
  var TYPE_POINTS_AT_SUPVERTEX = "4";
  var PHASE_QUESTION = "1";
  var PHASE_ANSWER = "2";
  var PHASE_FIND_SUPERVERTEX = "3";
  var PHASE_CONNECT_TREES = "4";

  var getDistance = function (edge) {
    if (distanceAttrib && edge[distanceAttrib]) {
      return edge[distanceAttrib];
    } else if (distanceAttrib && edge._get(distanceAttrib)) {
      return edge._get(distanceAttrib);
    } else if (distanceAttrib) {
      return Infinity;
    } else {
      return 1;
    }
  };
  var getMinActiveEdges = function (vertex, inEdges) {

    var result;
    var min = Infinity;
    while (vertex._outEdges.hasNext()) {
      e = vertex._outEdges.next();
      var edgeResult = e._getResult();
      var obj = {
        _id: e.__edgeInfo._id,
        _to: e._getTarget()._key,
        _target: e._getTarget(),
        from: vertex._getLocationInfo(),
        distance: edgeResult.distance
      };
      if (edgeResult.distance < min) {
        result = obj;
        min = edgeResult.distance;
      } else if (edgeResult.distance === min && [obj._to, result._to].sort()[0] === obj._to) {
        result = obj;
      }
    }

    inEdges.forEach(function (e) {
      var obj = {
        _id: e._id,
        _to: e._to,
        _target: e._target,
        from: vertex._getLocationInfo(),
        distance: e.distance
      };
      if (e.distance < min) {
        result = obj;
        min = e.distance;
      } else if (e.distance === min && [obj._to, result._to].sort()[0] === obj._to) {
        result = obj;
      }
    });

    return result;
  };


  var result = vertex._getResult();

  if (global.step === 0) {

    while (vertex._outEdges.hasNext()) {
      var e = vertex._outEdges.next();
      var edgeResult = e._getResult();
      edgeResult.distance = getDistance(e);
      e._setResult(edgeResult);
      var data = {edgeId: e.__edgeInfo._id, distance: edgeResult.distance};
      message.sendTo(e._getTarget(), data);
    }
  }

  var next;
  if (global.step === 1) {
    result.inEdges = [];
    while (message.hasNext()) {
      next = message.next();
      var inEdge = {
        _id: next.data.edgeId,
        _target : next.sender,
        _to: next.sender._key,
        root: next.sender,
        distance : next.data.distance
      };
      result.inEdges.push(inEdge);
    }
    result.closestEdge = getMinActiveEdges(vertex, result.inEdges);
    vertex._outEdges.resetCursor();
    if (!result.closestEdge) {
      vertex._deactivate();
      return;
    }
    result.type = TYPE_UNKNOWN;
    result.pointsTo = result.closestEdge._target;
    while (vertex._outEdges.hasNext()) {
      e = vertex._outEdges.next();
      if (e.__edgeInfo._id === result.closestEdge._id) {
        var edgeResult = e._getResult();
        edgeResult.inSpanTree = true;
        e._setResult(edgeResult);
      }
    }
    message.sendTo(result.closestEdge._target, {type: PHASE_QUESTION, edgeId: result.closestEdge._id});

    vertex._setResult(result);
    vertex._deactivate();
  }
  if (global.step > 1) {
    var response;
    var askers = [];
    while (message.hasNext()) {
      next = message.next();
      switch (next.data.type) {
        case PHASE_QUESTION:
          if (next.data.edgeId) {
            while (vertex._outEdges.hasNext()) {
              e = vertex._outEdges.next();
              if (e.__edgeInfo._id === next.data.edgeId) {
                var edgeResult = e._getResult();
                edgeResult.inSpanTree = true;
                e._setResult(edgeResult);
              }
            }
            vertex._outEdges.resetCursor();
          }
          if (next.sender._key === result.closestEdge._target._key) {
            if ([vertex._key, next.sender._key].sort()[0] === vertex._key) {
              result.type = TYPE_SUPERVERTEX;
              result.connectedSuperVertices = {};
              result.pointsTo = vertex._getLocationInfo();
              response = {type: PHASE_ANSWER, pointsTo: vertex._getLocationInfo(), isSuperVertex: true};
            } else if (result.type !== TYPE_SUPERVERTEX) {
              result.type = TYPE_POINTS_AT_SUPERVERTEX;
              result.pointsTo = next.sender;
              response = {type: PHASE_ANSWER, pointsTo: next.sender, isSuperVertex: true};
            }
          } else {
            askers.push(next.sender);
          }

          break;
        case PHASE_ANSWER:
          result.pointsTo = next.data.pointsTo;
          if (next.data.isSuperVertex) {
            result.type = TYPE_POINTS_AT_SUPERVERTEX;
          } else {
            message.sendTo(result.pointsTo, {type: PHASE_QUESTION});
          }

          break;
        case PHASE_FIND_SUPERVERTEX:
          if (result.pointsTo._key !== next.data.pointsTo._key &&
            [result.pointsTo._key , next.data.pointsTo._key].sort()[0] === result.pointsTo._key
            ) {
            if (result.type !== TYPE_SUPERVERTEX) {
              message.sendTo(result.pointsTo, next.data);
            } else {
              if (!result.connectedSuperVertices[next.data.pointsTo._key] ||
                result.connectedSuperVertices[next.data.pointsTo._key].distance > next.data.distance
                ) {
                result.connectedSuperVertices[next.data.pointsTo._key] = next.data;
              }
            }
          }

          break;

        case PHASE_CONNECT_TREES:
          while (vertex._outEdges.hasNext()) {
            e = vertex._outEdges.next();
            if (e.__edgeInfo._id === next.data.edgeId) {
              var edgeResult = e._getResult();
              edgeResult.inSpanTree = true;
              e._setResult(edgeResult);
            }
          }

          break;

        default :

      }
    }
    if (result.type === TYPE_UNKNOWN) {
      result.type = TYPE_POINTS_AT_SUPVERTEX;
    }
    askers.forEach(function (asker) {
      message.sendTo(asker, response ? response : {
        type: PHASE_ANSWER,
        pointsTo: result.pointsTo,
        isSuperVertex: result.type === TYPE_POINTS_AT_SUPERVERTEX || result.type === TYPE_SUPERVERTEX ? true : false
      });
    });
    vertex._deactivate();

  }
  vertex._setResult(result);
};


var finalAlgorithm = function (vertex, message, global) {
  var TYPE_SUPERVERTEX = "2";
  var PHASE_FIND_SUPERVERTEX = "3";
  var PHASE_CONNECT_TREES = "4";

  var finalPhase1 = "1";
  var finalPhase2 = "2";
  var result = vertex._getResult();

  if (!result.f) {
    result.f = finalPhase1;
    while (vertex._outEdges.hasNext()) {
      var e = vertex._outEdges.next();
      var edgeResult = e._getResult();
      message.sendTo(
        e._getTarget(),
        {
          type: PHASE_FIND_SUPERVERTEX,
          pointsTo: result.pointsTo,
          edgeId: e.__edgeInfo._id,
          root: vertex._getLocationInfo(),
          distance: edgeResult.distance
        }
      );
    }
    result.inEdges.forEach(function (e) {
      message.sendTo(
        e._target,
        {
          type: PHASE_FIND_SUPERVERTEX,
          pointsTo: result.pointsTo,
          edgeId: e._id,
          root: e.root,
          distance: e.distance
        }
      );
    });
  } else if (result.f === finalPhase1) {
    result.f = finalPhase2;
    if (result.type === TYPE_SUPERVERTEX) {
      Object.keys(result.connectedSuperVertices).forEach(function (c) {
        message.sendTo(
          result.connectedSuperVertices[c].root,
          {
            type: PHASE_CONNECT_TREES,
            edgeId: result.connectedSuperVertices[c].edgeId
          }
        );
      });
      return;
    }
  }
  vertex._setResult(result);
};

var getAlgorithm = function () {
  return {
    base  : boruvka.toString(),
    final : finalAlgorithm.toString()
  }
};


exports.getAlgorithm = getAlgorithm;



