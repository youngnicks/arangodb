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

#ifndef ARANGOD_HTTP_SERVER_REST_ENGINE_H
#define ARANGOD_HTTP_SERVER_REST_ENGINE_H 1

#include "Basics/Common.h"

#include "Basics/WorkItem.h"
#include "GeneralServer/RestStatus.h"
#include "Scheduler/EventLoop.h"

namespace arangodb {
class RestEngine;

namespace rest {
class RequestStatisticsAgent;
class RestHandler;
}

class RestEngine {
 public:
  enum class State { PREPARE, EXECUTE, RUN, FINALIZE, DONE, FAILED };

 public:
  RestEngine();

 public:
  void init();

  void init(EventLoop, rest::RequestStatisticsAgent*,
            std::function<void(rest::RestHandler*)> processResult) {
    _processResult = processResult;
  }

  void run(WorkItem::uptr<rest::RestHandler>);

  RestStatus syncRun();

  void setState(State state) { _state = state; }

  void processResult(rest::RestHandler* handler) { _processResult(handler); }

  void appendRestStatus(std::unique_ptr<RestStatus>);

  bool hasSteps() {
    return !_elements.empty();
  }

  RestStatusElement* popStep() {
    RestStatusElement* element = *_elements.rbegin();
    _elements.pop_back();
    return element;
  }

 private:
  State _state = State::PREPARE;
  std::function<void(rest::RestHandler*)> _processResult;
#warning CLEAR VECTOR
  std::vector<RestStatusElement*> _elements;
  std::vector<RestStatus*> _statusEntries;
};
}

#endif
