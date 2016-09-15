////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2014-2016 ArangoDB GmbH, Cologne, Germany
/// Copyright 2004-2014 triAGENS GmbH, Cologne, Germany
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

#ifndef ARANGOD_HTTP_SERVER_REST_HANDLER_H
#define ARANGOD_HTTP_SERVER_REST_HANDLER_H 1

#include "Basics/Common.h"

#include "Basics/Exceptions.h"
#include "Basics/WorkMonitor.h"
#include "Rest/GeneralResponse.h"
#include "Scheduler/JobQueue.h"
#include "Scheduler/EventLoop.h"
#include "Statistics/StatisticsAgent.h"

namespace arangodb {
class GeneralRequest;
class WorkMonitor;

namespace rest {
class RestHandlerFactory;

class RestHandler : public RequestStatisticsAgent, public arangodb::WorkItem {
  RestHandler(RestHandler const&) = delete;
  RestHandler& operator=(RestHandler const&) = delete;

 public:
  RestHandler(GeneralRequest*, GeneralResponse*);

 public:
  ~RestHandler() = default;

 public:
  enum class status { DONE, FAILED, ASYNC };

 public:
  virtual bool isDirect() const = 0;

  virtual bool needsOwnThread() const { return _needsOwnThread; }

  virtual size_t queue() const { return JobQueue::STANDARD_QUEUE; }

  virtual void prepareExecute() {}

  virtual status execute() = 0;

  virtual void finalizeExecute() {}

  virtual bool cancel() {
    _canceled.store(true);
    return false;
  }

  virtual void handleError(basics::Exception const&) = 0;

  virtual void addResponse(RestHandler*) {}

 public:
  uint64_t handlerId() const { return _handlerId; }
  uint64_t taskId() const { return _taskId; }
  void setTaskId(uint64_t taskId);

  status executeFull();

  GeneralRequest const* request() const { return _request.get(); }
  std::unique_ptr<GeneralRequest> stealRequest() { return std::move(_request); }

  GeneralResponse* response() const { return _response.get(); }
  std::unique_ptr<GeneralResponse> stealResponse() {
    return std::move(_response);
  }

  uint64_t messageId() {
    uint64_t messageId = 0UL;
    auto req = _request.get();
    auto res = _response.get();
    if (req) {
      messageId = req->messageId();
    } else if (res) {
      messageId = res->messageId();
    } else {
      LOG_TOPIC(WARN, Logger::COMMUNICATION)
          << "could not find corresponding request/response";
    }

    return messageId;
  }

 protected:
  void resetResponse(rest::ResponseCode);

 protected:
  uint64_t const _handlerId;
  uint64_t _taskId = 0;

  std::atomic<bool> _canceled;

  std::unique_ptr<GeneralRequest> _request;
  std::unique_ptr<GeneralResponse> _response;

 private:
  bool _needsOwnThread = false;
};
}
}

#endif
