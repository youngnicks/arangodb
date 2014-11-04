/*jslint indent: 2, nomen: true, maxlen: 120, sloppy: true, vars: true, white: true, plusplus: true */
/*global require, exports*/

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
var _ = require("underscore");
var colName = "profiler";

var disabled = true;

var timers = {};

exports.setup = function() {
  'use strict';
  if (disabled) {
    return;
  }
  db._truncate(colName);
};

exports.stopWatch = function() {
  'use strict';
  if (disabled) {
    return;
  }
  return t();
};

exports.storeWatch = function(name, time) {
  'use strict';
  if (disabled) {
    return;
  }
  time = t() - time;
  timers[name] = timers[name] || {
    count: 0,
    time: 0
  };
  timers[name].count++;
  timers[name].time += time;
};

exports.aggregate = function() {
  'use strict';
  if (disabled) {
    return;
  }
  var col = db[colName];
  _.each(timers, function(doc, key) {
    col.save({
      func: key,
      duration: doc.time,
      count: doc.count
    });
  });
  timers = {};
};
