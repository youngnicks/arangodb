//////////////////////////////////////////////////////////////////////////////
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
/// @author Achim Brandt
/// @author Dr. Frank Celler
/// @author Jan Christoph Uhde
////////////////////////////////////////////////////////////////////////////////

#include "GeneralCommTask.h"

#include "Basics/HybridLogicalClock.h"
#include "Basics/MutexLocker.h"
#include "Basics/StaticStrings.h"
#include "GeneralServer/AsyncJobManager.h"
#include "GeneralServer/GeneralServer.h"
#include "GeneralServer/GeneralServerFeature.h"
#include "GeneralServer/RestHandler.h"
#include "GeneralServer/RestHandlerFactory.h"
#include "Logger/Logger.h"
#include "Meta/conversion.h"
#include "Rest/VppResponse.h"
#include "Scheduler/Job.h"
#include "Scheduler/JobGuard.h"
#include "Scheduler/JobQueue.h"
#include "Scheduler/Scheduler.h"
#include "Scheduler/SchedulerFeature.h"
#include "Scheduler/TaskData.h"

using namespace arangodb;
using namespace arangodb::basics;
using namespace arangodb::rest;

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

GeneralCommTask::GeneralCommTask(EventLoop loop, GeneralServer* server,
                                 std::unique_ptr<Socket> socket,
                                 ConnectionInfo&& info, double keepAliveTimeout)
    : Task(loop, "GeneralCommTask"),
      SocketTask(loop, std::move(socket), std::move(info), keepAliveTimeout),
      _server(server) {}

// -----------------------------------------------------------------------------
// --SECTION--                                                 protected methods
// -----------------------------------------------------------------------------

void GeneralCommTask::executeRequest(
    std::unique_ptr<GeneralRequest>&& request,
    std::unique_ptr<GeneralResponse>&& response) {
  // check for an async request (before the handler steals the request)
  bool found = false;
  std::string const& asyncExecution =
      request->header(StaticStrings::Async, found);

  // store the message id for error handling
  uint64_t messageId = 0UL;
  if (request) {
    messageId = request->messageId();
  } else if (response) {
    messageId = response->messageId();
  } else {
    LOG_TOPIC(WARN, Logger::COMMUNICATION)
        << "could not find corresponding request/response";
  }

  // create a handler, this takes ownership of request and response
  WorkItem::uptr<RestHandler> handler(
      GeneralServerFeature::HANDLER_FACTORY->createHandler(
          std::move(request), std::move(response)));

  if (handler == nullptr) {
    LOG(TRACE) << "no handler is known, giving up";
    handleSimpleError(rest::ResponseCode::NOT_FOUND, messageId);
    return;
  }

  handler->setTaskId(_taskId);

  // asynchronous request
  bool ok = false;

  if (found && (asyncExecution == "true" || asyncExecution == "store")) {
    getAgent(messageId)->requestStatisticsAgentSetAsync();
    uint64_t jobId = 0;

    if (asyncExecution == "store") {
      // persist the responses
      ok = handleRequestAsync(std::move(handler), &jobId);
    } else {
      // don't persist the responses
      ok = handleRequestAsync(std::move(handler));
    }

    if (ok) {
      std::unique_ptr<GeneralResponse> response =
          createResponse(rest::ResponseCode::ACCEPTED, messageId);

      if (jobId > 0) {
        // return the job id we just created
        response->setHeaderNC(StaticStrings::AsyncId, StringUtils::itoa(jobId));
      }

      processResponse(response.get());
      return;
    } else {
      handleSimpleError(rest::ResponseCode::SERVER_ERROR, TRI_ERROR_QUEUE_FULL,
                        TRI_errno_string(TRI_ERROR_QUEUE_FULL), messageId);
    }
  }

  // synchronous request
  else {
    ok = handleRequest(std::move(handler));
  }

  if (!ok) {
    handleSimpleError(rest::ResponseCode::SERVER_ERROR, messageId);
  }
}

void GeneralCommTask::processResponse(GeneralResponse* response) {
  if (response == nullptr) {
    LOG_TOPIC(WARN, Logger::COMMUNICATION)
        << "processResponse received a nullptr, closing connection";
    closeStream();
  } else {
    addResponse(response);
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

void GeneralCommTask::signalTask(std::unique_ptr<TaskData> data) {
  // data response
  if (data->_type == TaskData::TASK_DATA_RESPONSE) {
    data->RequestStatisticsAgent::transferTo(
        getAgent(data->_response->messageId()));
    processResponse(data->_response.get());
  }

  // data chunk
  else if (data->_type == TaskData::TASK_DATA_CHUNK) {
    handleChunk(data->_data.c_str(), data->_data.size());
  }

  // do not know, what to do - give up
  else {
    closeStream();
  }

  while (processRead()) {
    if (_closeRequested) {
      break;
    }
  }
}

bool GeneralCommTask::handleRequest(WorkItem::uptr<RestHandler> handler) {
  JobGuard guard(_loop);

  if (handler->isDirect()) {
    handleRequestDirectly(std::move(handler));
    return true;
  }

  if (guard.isIdle()) {
    handleRequestDirectly(std::move(handler));
    return true;
  }

  bool startThread = handler->needsOwnThread();

  if (startThread) {
    guard.block();
    handleRequestDirectly(std::move(handler));
    return true;
  }

  // ok, we need to queue the request
  LOG_TOPIC(DEBUG, Logger::THREADS) << "too much work, queuing handler";
  size_t queue = handler->queue();
  uint64_t messageId = handler->messageId();

  auto job = new arangodb::Job(_server, std::move(handler),
                               [this](WorkItem::uptr<RestHandler> h) {
                                 handleRequestDirectly(std::move(h));
                               });

  bool ok = SchedulerFeature::SCHEDULER->jobQueue()->queue(queue, job);

  if (!ok) {
    handleSimpleError(rest::ResponseCode::SERVER_ERROR, TRI_ERROR_QUEUE_FULL,
                      TRI_errno_string(TRI_ERROR_QUEUE_FULL), messageId);
  }

  return ok;
}

void GeneralCommTask::handleRequestDirectly(
    WorkItem::uptr<RestHandler> handler) {
  RequestStatisticsAgent* agent = getAgent(handler->messageId());

  handler->initEngine(_loop, agent, [this](RestHandler* handler) {
    addResponse(handler->response());
  });
  handler->runEngine(std::move(handler));
}

bool GeneralCommTask::handleRequestAsync(WorkItem::uptr<RestHandler> handler,
                                         uint64_t* jobId) {
  // extract the coordinator flag
  bool found;
  std::string const& hdrStr =
      handler->request()->header(StaticStrings::Coordinator, found);
  char const* hdr = found ? hdrStr.c_str() : nullptr;

  // use the handler id as identifier
  bool store = false;

  if (jobId != nullptr) {
    store = true;
    *jobId = handler->handlerId();
    GeneralServerFeature::JOB_MANAGER->initAsyncJob(handler.get(), hdr);
  }

  if (store) {
    handler->initEngine(_loop, nullptr, [this](RestHandler* handler) {
      GeneralServerFeature::JOB_MANAGER->finishAsyncJob(handler);
    });
  } else {
    handler->initEngine(_loop, nullptr, [this](RestHandler* handler) {});
  }

  // queue this job
  size_t queue = handler->queue();
  std::unique_ptr<Job> job(new Job(_server, std::move(handler),
                                   [](WorkItem::uptr<RestHandler> handler) {
                                     handler->runEngine(std::move(handler));
                                   }));

  return SchedulerFeature::SCHEDULER->jobQueue()->queue(queue, job.release());
}
