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
  PregelAPI = require ("org/arangodb/api/pregel").PregelAPI,
  checkParameter = arangodb.checkParameter;

exports.startExecution = function (graphName, pregelAlgorithm, conductorAlgorithm, aggregator, globals) {
  'use strict';

  checkParameter(
    "startExecution(String <graphName>, function <pregelAlgorithm>,  function [<conductorAlgorithm>], " +
      "function [<aggregator>] , Object [<version>])",
    [ [ "GraphName graphName", "string" ],
      [ "PregelAlgorithm pregelAlgorithm", "function" ]
    ],
    [ graphName, pregelAlgorithm] );

  var body = {};
  body.graphName = graphName;
  body.pregelAlgorithm = pregelAlgorithm.toString();
  if (conductorAlgorithm) {
    body.conductorAlgorithm = conductorAlgorithm.toString();
  }
  if (aggregator) {
    body.aggregator = aggregator.toString();
  }
  if (globals) {
    body.options = globals;
  }

  return PregelAPI.execute(body);
};

exports.getResult =  function (executionNumber) {
  'use strict';

  checkParameter(
    "getResult(String <executionNumber>)",
    [ [ "ExecutionNumber executionNumber", "string" ]],
    [ executionNumber ] );
  return PregelAPI.getResult(executionNumber);
};

exports.dropResult = function (executionNumber) {
  'use strict';

  checkParameter(
    "dropResult(String <executionNumber>)",
    [ [ "ExecutionNumber executionNumber", "string" ]],
    [ executionNumber ] );
  return PregelAPI.dropResult(executionNumber);
};

exports.getStatus = function (executionNumber) {
  'use strict';

  checkParameter(
    "getStatus(String <executionNumber>)",
    [ [ "ExecutionNumber executionNumber", "string" ]],
    [ executionNumber ] );
  return PregelAPI.getStatus(executionNumber);
};

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

