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
/// @author Andreas Streichardt
/// @author Frank Celler
////////////////////////////////////////////////////////////////////////////////

#include "Communicator.h"

#include "Basics/MutexLocker.h"
#include "Basics/socket-utils.h"
#include "Logger/Logger.h"

#define MAX_WAIT_MSECS 30 * 1000 /* Wait max. 30 seconds */

using namespace arangodb;
using namespace arangodb::communicator;

namespace {
std::atomic_uint_fast64_t NEXT_TICKET_ID(static_cast<uint64_t>(0));
}

Communicator::Communicator() : _curl(nullptr) {
  curl_global_init(CURL_GLOBAL_ALL);
  _curl = curl_multi_init();
  
  pipe(_fds);
  TRI_SetNonBlockingSocket(fds[0]);

  _wakeup.fd = _fds[0];
  _wakeup.events = CURL_WAIT_POLLIN;
}

Ticket Communicator::addRequest(Destination destination,
                                std::unique_ptr<GeneralRequest> request,
                                Callbacks callbacks, Options options) {
  uint64_t id = NEXT_TICKET_ID.fetch_add(1, std::memory_order_seq_cst);

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    _newRequests.emplace_back(destination, std::move(request), callbacks,
                              options, id);
  }
  write(fds[1], "x", 1);

  return Ticket{id};
}

void Communicator::work_once() {
  

  std::vector<NewRequest> newRequests;

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    newRequests.swap(_newRequests);
  }

  for (auto newRequest : newRequests) {
    uint64_t ticketId = newRequest._id;

    _requestsInProgress[ticketId] =
        createRequestInProgress(std::move(newRequest));
  }

  _mc = curl_multi_perform(_curl, &_stillRunning);
  if (_mc != CURLM_OK) {
    // TODO?
    return;
  }
  int res = curl_multi_wait(_curl, &_wakeup, 1, MAX_WAIT_MSECS, &_numFds);
}

RequestInProgress Communicator::createRequestInProgress(NewRequest newRequest) {
  RequestInProgress request();
  return request;
}
