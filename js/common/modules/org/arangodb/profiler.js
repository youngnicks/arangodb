/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports, Graph, arguments */

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
/// @author Michael Hackstein
/// @author Copyright 2011-2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////
var db = require("internal").db;
var t = require("internal").time;

exports.setup = function() {
  db._truncate("_profile");
};

exports.stopWatch = function() {
  //return t();
};

exports.storeWatch = function(name, time) {
  return;
  time = t() - time;
  db._executeTransaction({
    collections: {
      write: ["_profile"]
    },
    action: function(params) {
      var col = require("internal").db._profile;
      if (col.exists(params.name)) {
        var doc = col.document(params.name);
        doc.duration += params.time;
        doc.invocations++;
        col.update(doc._key, doc);
        return;
      }
      col.save({
        _key: params.name,
        duration: params.time,
        invocations: 1
      });
    },
    params: {
      time: time,
      name: name
    }
  });
};
