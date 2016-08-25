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

#include <iostream>

#include "Basics/MutexLocker.h"
#include "Basics/socket-utils.h"
#include "Logger/Logger.h"

using namespace arangodb;
using namespace arangodb::communicator;

namespace {
std::atomic_uint_fast64_t NEXT_TICKET_ID(static_cast<uint64_t>(0));
}

Communicator::Communicator() : _curl(nullptr) {
  curl_global_init(CURL_GLOBAL_ALL);
  _curl = curl_multi_init();

#if _WIN32
#warning TODO
#else
  pipe(_fds);

  TRI_socket_t socket = {.fileDescriptor = _fds[0]};
  TRI_SetNonBlockingSocket(socket);
#endif

  _wakeup.fd = _fds[0];
  _wakeup.events = CURL_WAIT_POLLIN;
}

Ticket Communicator::addRequest(Destination destination,
                                std::unique_ptr<GeneralRequest> request,
                                Callbacks callbacks, Options options) {
  uint64_t id = NEXT_TICKET_ID.fetch_add(1, std::memory_order_seq_cst);

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    _newRequests.emplace_back(
        NewRequest{destination, std::move(request), callbacks, options, id});
  }

  write(_fds[1], "x", 1);

  return Ticket{id};
}

void Communicator::work_once() {
  std::vector<NewRequest> newRequests;

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    newRequests.swap(_newRequests);
  }

  for (auto const& newRequest : newRequests) {
    createRequestInProgress(newRequest);
  }

  _mc = curl_multi_perform(_curl, &_stillRunning);
  std::cout << "RUNNING: " << _stillRunning << std::endl;

  if (_mc != CURLM_OK) {
    // TODO?
    return;
  }

  // handle all messages received
  CURLMsg* msg = nullptr;
  int msgsLeft = 0;

  while ((msg = curl_multi_info_read(_curl, &msgsLeft))) {
    if (msg->msg == CURLMSG_DONE) {
      CURL* eh = msg->easy_handle;

      handleResult(eh, msg->data.result);
    }
  }
}

void Communicator::wait() {
  static int const MAX_WAIT_MSECS = 1000;  // wait max. 1 seconds

  int res = curl_multi_wait(_curl, &_wakeup, 1, MAX_WAIT_MSECS, &_numFds);

  // drain the pipe
  char a[16];

  while (0 < read(_fds[0], a, sizeof(a))) {
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

void Communicator::createRequestInProgress(NewRequest const& newRequest) {
  CURL* eh = curl_easy_init();

  std::unique_ptr<RequestInProgress> request(
      new RequestInProgress{eh, newRequest._destination, newRequest._callbacks,
                            newRequest._options, newRequest._ticketId});

  curl_easy_setopt(eh, CURLOPT_HEADER, 0L);
  curl_easy_setopt(eh, CURLOPT_URL, newRequest._destination.url().c_str());
  curl_easy_setopt(eh, CURLOPT_PRIVATE, request.get());
  curl_easy_setopt(eh, CURLOPT_VERBOSE, 0L);

  _requestsInProgress.emplace(newRequest._ticketId, std::move(request));

  curl_multi_add_handle(_curl, eh);
}

void Communicator::handleResult(CURL* eh, CURLcode rc) {
  RequestInProgress* request = nullptr;

  curl_easy_getinfo(eh, CURLINFO_PRIVATE, &request);

  if (request == nullptr) {
    curl_multi_remove_handle(_curl, eh);
    curl_easy_cleanup(eh);
    return;
  }

  switch (rc) {
    case CURLE_OK: {
      long httpStatusCode = 200;
      curl_easy_getinfo(eh, CURLINFO_RESPONSE_CODE, &httpStatusCode);

      std::unique_ptr<GeneralResponse> response(new HttpResponse(
          static_cast<GeneralResponse::ResponseCode>(httpStatusCode)));
      transformResult(eh, dynamic_cast<HttpResponse*>(response.get()));

      if (httpStatusCode < 400) {
        request->_callbacks._onSuccess(std::move(response));
      } else {
        request->_callbacks._onError(httpStatusCode, std::move(response));
      }
      break;
    }

    default:
      request->_callbacks._onError(TRI_ERROR_INTERNAL, {nullptr});
      break;
  }

  // remove request in progress
  _requestsInProgress.erase(request->_ticketId);

  // and remove easy handle
  curl_multi_remove_handle(_curl, eh);
  curl_easy_cleanup(eh);
}

void Communicator::transformResult(CURL* eh, HttpResponse* response) {}
