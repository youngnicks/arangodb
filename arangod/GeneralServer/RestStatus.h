////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2016 ArangoDB GmbH, Cologne, Germany
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
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Dr. Frank Celler
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGOD_HTTP_SERVER_REST_STATUS_H
#define ARANGOD_HTTP_SERVER_REST_STATUS_H 1

#include "Basics/Common.h"

namespace arangodb {
class RestStatus {
 public:
  static RestStatus const ABANDON;
  static RestStatus const DONE;
  static RestStatus const FAILED;
  static RestStatus const QUEUE;

 public:
  enum class Status { DONE, FAILED, ABANDONED, QUEUED };

 public:
  RestStatus(Status status) : _status(status) {}

 public:
  RestStatus then(std::function<void()>);
  RestStatus then(std::function<RestStatus>);

 public:
  bool done() const { return _status == Status::DONE; }
  bool failed() const { return _status == Status::FAILED; }
  bool abandoned() const { return _status == Status::ABANDONED; }

 private:
  Status _status = Status::DONE;
};
}

#endif
