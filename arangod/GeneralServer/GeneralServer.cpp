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
/// @author Achim Brandt
////////////////////////////////////////////////////////////////////////////////

#include "GeneralServer.h"

#include "Basics/ConditionLocker.h"
#include "Basics/MutexLocker.h"
#include "Endpoint/EndpointList.h"
#include "GeneralServer/AsyncJobManager.h"
#include "GeneralServer/GeneralListenTask.h"
#include "GeneralServer/RestHandler.h"
#include "Logger/Logger.h"
#include "Rest/CommonDefines.h"
#include "Scheduler/ListenTask.h"
#include "Scheduler/Scheduler.h"
#include "Scheduler/SchedulerFeature.h"

using namespace arangodb;
using namespace arangodb::basics;
using namespace arangodb::rest;

// -----------------------------------------------------------------------------
// --SECTION--                                             static public methods
// -----------------------------------------------------------------------------

int GeneralServer::sendChunk(uint64_t taskId, std::string const& data) {
#warning TODO
#if 0
  auto taskData = std::make_unique<TaskData>();

  taskData->_taskId = taskId;
  taskData->_loop = SchedulerFeature::SCHEDULER->lookupLoopById(taskId);
  taskData->_type = TaskData::TASK_DATA_CHUNK;
  taskData->_data = data;

  SchedulerFeature::SCHEDULER->signalTask(taskData);
#endif

  return TRI_ERROR_NO_ERROR;
}

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void GeneralServer::setEndpointList(EndpointList const* list) {
  _endpointList = list;
}

void GeneralServer::startListening() {
  for (auto& it : _endpointList->allEndpoints()) {
    LOG(TRACE) << "trying to bind to endpoint '" << it.first
               << "' for requests";

    bool ok = openEndpoint(it.second);

    if (ok) {
      LOG(DEBUG) << "bound to endpoint '" << it.first << "'";
    } else {
      LOG(FATAL) << "failed to bind to endpoint '" << it.first
                 << "'. Please check whether another instance is already "
                    "running using this endpoint and review your endpoints "
                    "configuration.";
      FATAL_ERROR_EXIT();
    }
  }
}

void GeneralServer::stopListening() {
  for (auto& task : _listenTasks) {
    task->stop();
  }

  _listenTasks.clear();
}

// -----------------------------------------------------------------------------
// --SECTION--                                                 protected methods
// -----------------------------------------------------------------------------

bool GeneralServer::openEndpoint(Endpoint* endpoint) {
  ProtocolType protocolType;

  if (endpoint->transport() == Endpoint::TransportType::HTTP) {
    if (endpoint->encryption() == Endpoint::EncryptionType::SSL) {
      protocolType = ProtocolType::HTTPS;
    } else {
      protocolType = ProtocolType::HTTP;
    }
  } else {
    if (endpoint->encryption() == Endpoint::EncryptionType::SSL) {
      protocolType = ProtocolType::VPPS;
    } else {
      protocolType = ProtocolType::VPP;
    }
  }

  std::unique_ptr<ListenTask> task(new GeneralListenTask(
      SchedulerFeature::SCHEDULER->eventLoop(), this, endpoint, protocolType));
  task->start();

  if (!task->isBound()) {
    return false;
  }

  _listenTasks.emplace_back(task.release());
  return true;
}
