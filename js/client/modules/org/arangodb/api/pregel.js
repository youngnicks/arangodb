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

var PregelAPI,
  arangodb = require("org/arangodb"),
  arangosh = require("org/arangodb/arangosh")

PregelAPI = {
  send: function (method, executionNumber, path, data) {
    var results = arangodb.arango[method]("/_api/pregel/" +
      path +
      encodeURIComponent(executionNumber),
      JSON.stringify(data));

    arangosh.checkRequestResult(results);
    return results;
  },

  sendWithoutData: function (method, executionNumber, path) {
    var results = arangodb.arango[method]("/_api/pregel/" +
      path +
      encodeURIComponent(executionNumber)
    );

    arangosh.checkRequestResult(results);
    return results;
  },

  getResult: function (executionNumber) {
    return PregelAPI.sendWithoutData("GET", executionNumber, "result/");
  },

  dropResult: function (executionNumber) {
    return PregelAPI.send("POST", executionNumber, "dropResult/", null);
  },

  getStatus: function (executionNumber) {
    return PregelAPI.sendWithoutData("GET", executionNumber, "status/");
  },

  execute: function (body) {
    return PregelAPI.send("POST", "", "startExecution", body);
  }

};

exports.PregelAPI = PregelAPI;
