/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments, ArangoClusterComm */

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

var actions = require("org/arangodb/actions");


////////////////////////////////////////////////////////////////////////////////
/// @brief handle post requests
////////////////////////////////////////////////////////////////////////////////

function post_pregel (req, res) {
  require("internal").print("XXXXXXXXXXXXXXXXXXX" + req.suffix);
  /*if (req.suffix.length === 0) {
    // POST /_api/graph
    post_graph_graph(req, res);
  }
  else if (req.suffix.length > 1) {
    var g;

    // POST /_api/graph/<key>/...
    try {
      g = graph_by_request(req);
    }
    catch (err) {
      actions.resultNotFound(req, res, arangodb.ERROR_GRAPH_INVALID_GRAPH, err);
      return;
    }

    switch (req.suffix[1]) {
      case ("vertex") :
        post_graph_vertex(req, res, g);
        break;

      case ("edge") :
        post_graph_edge(req, res, g);
        break;

      case ("vertices") :
        post_graph_vertices(req, res, g);
        break;

      case ("edges") :
        post_graph_edges(req, res, g);
        break;

      default:
        actions.resultUnsupported(req, res);
    }

  }
  else {
    actions.resultUnsupported(req, res);
  }*/
}



actions.defineHttp({
  url : "_api/pregel",
  context : "pregel",
  prefix : "false",
  callback : function (req, res) {
    try {
       if (req.requestType === actions.POST) {
        post_pregel(req, res);
       } else {
        actions.resultUnsupported(req, res);
      }
    }
    catch (err) {
      actions.resultException(req, res, err, undefined, false);
    }
  }
});
