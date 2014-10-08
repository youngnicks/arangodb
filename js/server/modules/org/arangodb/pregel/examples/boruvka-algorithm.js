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
  require("internal").print(global)

  _ = require("underscore");
  var distanceAttrib = global.distance;
  var next;

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
      //require("internal").print("KKKKKKKKKKKKKKKKKKKKKKK", vertex._get("_key"));
      var data = {edgeId: e.__edgeInfo._id, distance: edgeResult.distance};
      //require("internal").print(vertex._key, e._getTarget(), data)
      message.sendTo(e._getTarget(), data);
    }
  }

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
    result.type = "unknown";
    result.pointsTo = result.closestEdge._target;
    while (vertex._outEdges.hasNext()) {
      e = vertex._outEdges.next();
      if (e.__edgeInfo._id === result.closestEdge._id) {
        var edgeResult = e._getResult();
        require("internal").print("STEP1", vertex._key,"---" , e._getTarget())
        edgeResult.inSpanTree = true;
        e._setResult(edgeResult);
      }
    }
    require("internal").print("CLOSESTEDGESTEP1", vertex._key,"---" , result.closestEdge._target, {type: "Question", edgeId: result.closestEdge._id})
    message.sendTo(result.closestEdge._target, {type: "Question", edgeId: result.closestEdge._id});

    vertex._setResult(result);
    vertex._deactivate();
  }
  if (global.step > 1) {
    var response;
    var askers = [];
    while (message.hasNext()) {
      next = message.next();
      switch (next.data.type) {
        case "Question":
          if (next.data.edgeId) {
            while (vertex._outEdges.hasNext()) {
              e = vertex._outEdges.next();
              if (e.__edgeInfo._id === next.data.edgeId) {
                var edgeResult = e._getResult();
                require("internal").print("QUESTION", global.step, "---" , vertex._get("_key"), e._getTarget())
                edgeResult.inSpanTree = true;
                e._setResult(edgeResult);
              }
            }
          }
          if (next.sender._key === result.closestEdge._target._key) {
            if ([vertex._key, next.sender._key].sort()[0] === vertex._key) {
              require("internal").print("IS SUPRER : " , vertex._key)
              result.type = "superVertex";
              result.connectedSuperVertices = {};
              result.pointsTo = vertex._getLocationInfo();
              response = {type: "Answer", pointsTo: vertex._getLocationInfo(), isSuperVertex: true};
            } else if (result.type !== "superVertex") {
              require("internal").print("POINTS TO  SUPRER : " , vertex._key)
              result.type = "pointsAtSuperVertex";
              result.pointsTo = next.sender;
              response = {type: "Answer", pointsTo: next.sender, isSuperVertex: true};
            }
          } else {
            askers.push(next.sender);
          }

          break;
        case "Answer":
          result.pointsTo = next.data.pointsTo;
          if (next.data.isSuperVertex) {
            result.type = "pointsAtSuperVertex"
          } else {
            message.sendTo(result.pointsTo, {type: "Question"});
          }

          break;
        case "SuperStep":
          //require("internal").print("SUPERSTEP")
          if (result.pointsTo._key !== next.data.pointsTo._key &&
            [result.pointsTo._key , next.data.pointsTo._key].sort()[0] === result.pointsTo._key
            ) {
            if (result.type !== "superVertex") {
              //require("internal").print("SS, passing it along from ", vertex._get("_key"), " to ",  result.pointsTo, " containing", next.data)
              message.sendTo(result.pointsTo, next.data);
            } else {
              //require("internal").print("connectedSuperVertices");
              //require("internal").print(result.connectedSuperVertices);
              if (!result.connectedSuperVertices[next.data.pointsTo._key] ||
                result.connectedSuperVertices[next.data.pointsTo._key].distance > next.data.distance
                ) {
                result.connectedSuperVertices[next.data.pointsTo._key] = next.data;
                //require("internal").print(vertex._get("_key"), result.connectedSuperVertices);
              }
            }
          }

          break;

        case "finalConnect":
          //require("internal").print("finalConnect")
          //require("internal").print("finalConnect", vertex._get("_key"))
          while (vertex._outEdges.hasNext()) {
            e = vertex._outEdges.next();
            if (e.__edgeInfo._id === next.data.edgeId) {
              var edgeResult = e._getResult();
              require("internal").print("QUESTIONFINALCONNECT", global.step, "---" , vertex._get("_key"), e._getTarget())
              edgeResult.inSpanTree = true;
              e._setResult(edgeResult);
            }
          }

          break;

        default :

      }
    }
    if (result.type === "unknown") {
      result.type = "pointsAtSubVertex";
    }
    askers.forEach(function (asker) {
      require("internal").print("Step", global.step, " send to asker", vertex._get("_id"), " to ", asker, response ? response : {
        type: "Answer",
        pointsTo: result.pointsTo,
        isSuperVertex: result.type === "pointsAtSuperVertex" || result.type === "superVertex" ? true : false
      });
      message.sendTo(asker, response ? response : {
        type: "Answer",
        pointsTo: result.pointsTo,
        isSuperVertex: result.type === "pointsAtSuperVertex" || result.type === "superVertex" ? true : false
      });
    });
    vertex._deactivate();

  }
  vertex._setResult(result);
};


var finalAlgorithm = function (vertex, message, global) {
   var distanceAttrib = global.distanceAttribute;

  var finalPhase1 = "vertexReachOut";
  var finalPhase2 = "finalConnect";
  var result = vertex._getResult();

  if (!result.finalPhase) {
    result.finalPhase = finalPhase1;
    while (vertex._outEdges.hasNext()) {
      var e = vertex._outEdges.next();
      //require("internal").print("inf final ", vertex._get("_key"), " sends to ", result.pointsTo);
      var edgeResult = e._getResult();
      message.sendTo(
        e._getTarget(),
        {
          type: "SuperStep",
          pointsTo: result.pointsTo,
          edgeId: e.__edgeInfo._id,
          root: vertex._getLocationInfo(),
          distance: edgeResult.distance
        }
      );
    }
    result.inEdges.forEach(function (e) {
      //require("internal").print("in final ", vertex._get("_key"), " sends to ", result.pointsTo);
      message.sendTo(
        e._target,
        {
          type: "SuperStep",
          pointsTo: result.pointsTo,
          edgeId: e._id,
          root: e.root,
          distance: e.distance
        }
      );
    });
  } else if (result.finalPhase === finalPhase1) {
    result.finalPhase = finalPhase2;
    if (result.type === "superVertex") {
      Object.keys(result.connectedSuperVertices).forEach(function (c) {
        message.sendTo(
          result.connectedSuperVertices[c].root,
          {
            type: "finalConnect",
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



