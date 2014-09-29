/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, createSpy, createSpyObj, afterEach, runs, waitsFor */
/*global ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief pregel implementation of the graph shortes path algorithm
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

var shortestPath = function (vertex, message, global) {
  _ = require("underscore");
  var distanceAttrib;
  var next;

  var CALC_PATHS = "paths";
  var CALC_CENTRALITY = "centralityMeasures";

  var getDistance = function (edge) {
    if (distanceAttrib) {
      return edge[distanceAttrib];
    } else {
      return 1;
    }
  };

  var mergePaths = function (pathList1, pathList2) {
    var r = [];
    pathList1.forEach(function (p1) {
      pathList2.forEach(function (p2) {
        r.push(p1.concat(p2));
      });
    });
    return r
  };

  var result = vertex._getResult(), saveResult = false;

  switch (result.finalStep) {
    case CALC_CENTRALITY:
      result.eccentricity = (1 / result.absEccentricity) / global.maxRevEccentricity;
      result.closeness = (result.absCloseness) / global.maxCloseness;
      result.diameter = global.diameter;
      result.radius = global.radius;
      saveResult = true;
      break;

    case  CALC_PATHS:
      while (message.hasNext()) {
        next = message.next();
        if (!next.data.finish) {
          if (!result.sP[next.data.t]) {
            continue;
          }
          if (Math.abs(next.data.d - result.sP[next.data.t].distance) > 0.00001) {
            continue;
          }

          if (result.sP[next.data.t].done) {
            message.sendTo(next.data.r, {
                finish: mergePaths(next.data.p, result.sP[next.data.t].paths),
                t: next.data.t
              }
            );
          } else {
            vertex._outEdges.forEach(function (e) {
              message.sendTo(e._targetVertex, {
                r: next.data.r,
                t: next.data.t,
                d: result.sP[next.data.t].distance - result.sP[e._to].distance,
                p: mergePaths(next.data.p, result.sP[e._to].paths)
              });
            });
          }
        } else {
          if (!result.sP[next.data.t].paths) {
            result.sP[next.data.t].paths = next.data.finish;
          } else {
            result.sP[next.data.t].paths = result.sP[next.data.t].paths.concat(next.data.finish);
          }
          result.sP[next.data.t].done = true;
          saveResult = true;
        }

      }

      break;

    default :
      if (global.step === 0) {
        result = {
          inBound: [],
          sP: {

          }
        };
        result.sP[vertex._doc._id] = {
          distance: 0,
          shard: vertex._locationInfo.shard
        };
        vertex._outEdges.forEach(function (e) {
          var data = {};
          data[e._from] = {};
          data[e._from][e._to] = {
            distance: getDistance(e),
            shard: e._targetVertex.shard
          };

          result.sP[e._to] = data[e._from][e._to];
          message.sendTo(e._targetVertex, data);
        });
        saveResult = true;

      } else if (global.step === 1) {
        while (message.hasNext()) {
          next = message.next();
          var data = {};
          Object.keys(next.data).forEach(function (v) {
            data[v] = {};
            Object.keys(result.sP).forEach(function (s) {
              data[v][s] = {
                distance: next.data[v][vertex._doc._id].distance + result.sP[s].distance,
                shard: result.sP[s].shard
              };
            });
            message.sendTo(next.sender, data);
          });
          saveResult = true;
          result.inBound.push(next.sender);
        }
      } else if (global.step === 2) {
        while (message.hasNext()) {
          next = message.next();
          Object.keys(next.data[vertex._doc._id]).forEach(function (t) {
            if (vertex._doc._id === t) {
              return;
            }
            if (!result.sP[t]) {
              result.sP[t] = {
                distance: Infinity,
                shard: next.data[vertex._doc._id][t].shard
              };
              saveResult = true;
            }

            if (result.sP[t].distance > next.data[vertex._doc._id][t].distance) {
              saveResult = true;
              result.sP[t] = next.data[vertex._doc._id][t]
            }
          });
        }
        result.inBound.forEach(function (i) {
          message.sendTo(i, result.sP);
        });
      } else {
        var send = false;
        while (message.hasNext()) {
          next = message.next();
          Object.keys(next.data).forEach(function (t) {
            next.data[t].distance = next.data[t].distance + result.sP[next.sender._id].distance;
            if (vertex._doc._id === t) {
              return;
            }
            if (!result.sP[t]) {
              result.sP[t] = {
                distance: Infinity,
                shard: next.data[t].shard
              };
              saveResult = true;
            }
            if (result.sP[t].distance > next.data[t].distance) {
              result.sP[t] = next.data[t]
              saveResult = true;
              send = true;
            }
          });
        }
        if (send) {
          result.inBound.forEach(function (i) {
            message.sendTo(i, result.sP);
          });
        }
      }
  }

  if (saveResult === true) {
    vertex._setResult(result);
  }
  vertex._deactivate();
};

var finalAlgorithm = function (vertex, message, global) {
  var distanceAttrib;

  var result = vertex._getResult();
  var sP = result.sP;

  if (!global.calculate) {
    return;
  }
  if (global.calculate === "paths") {
    var getDistance = function (edge) {
      if (distanceAttrib) {
        return edge[distanceAttrib];
      } else {
        return 1;
      }
    };
    var done = true;
    Object.keys(sP).forEach(function (target) {
      if (!sP[target].done) {
        done = false;
      }
    });
    if (done) {
      return;
    }
    result.finalStep = global.calculate;

    vertex._outEdges.forEach(function (e) {
      if (getDistance(e) === result.sP[e._to].distance) {
        result.sP[e._to].paths = [
          [e._from + "_" + e._to]
        ];
        result.sP[e._to].done = true;
      }
    });
    Object.keys(sP).forEach(function (target) {
      if (result.sP[target].done) {
        return;
      }
      if (target === vertex._doc._id) {
        result.sP[target].paths = [];
        result.sP[target].done = true;
        return;
      }
      vertex._outEdges.forEach(function (e) {
        message.sendTo(e._targetVertex, {
          r: vertex._locationInfo,
          t: target,
          d: result.sP[target].distance - result.sP[e._to].distance,
          p: [
            [e._from + "_" + e._to]
          ]
        });
      });
    })
  }
  if (global.calculate === "centralityMeasures" && !global.maxRevEccentricity) {
    Object.keys(sP).forEach(function (t) {
      if (!result.absEccentricity) {
        result.absEccentricity = sP[t].distance;
      } else {
        result.absEccentricity = Math.max(result.absEccentricity, sP[t].distance);
      }
      if (!result.absCloseness) {
        result.absCloseness = sP[t].distance === 0 ? 0 : 1 / sP[t].distance;
      } else {
        result.absCloseness = result.absCloseness + sP[t].distance === 0 ? 0 : 1 / sP[t].distance;
      }
    });
    global.data.push({e: result.absEccentricity, c: result.absCloseness});
    result.finalStep = global.calculate;
    message.sendTo(vertex._locationInfo, {});
  }
  vertex._deactivate();
};

var conductorAlgorithm = function (globals, stepInfo) {
  if (globals.calculate === "centralityMeasures" && stepInfo.final && stepInfo.data.length > 0) {
    var max = 0, tmp, radius = Infinity, diameter = 0, maxCloseness = 0;
    stepInfo.data.forEach(function (r) {
      tmp = r.e === 0 ? 0 : 1 / r.e;
      if (tmp > max) {
        max = tmp;
      }
      if (r.e > diameter) {
        diameter = r.e;
      }
      if (r.e < radius) {
        radius = r.e;
      }
      if (r.c > maxCloseness) {
        maxCloseness = r.c;
      }
    });
    globals.diameter = diameter;
    globals.radius = radius;
    globals.maxCloseness = maxCloseness;
    globals.maxRevEccentricity = max;
  } else {
    return;
  }
};


var getAlgorithm = function () {
  return {
    base  : shortestPath.toString(),
    final : finalAlgorithm.toString(),
    superstep : conductorAlgorithm.toString()
  }
}


exports.getAlgorithm = getAlgorithm;