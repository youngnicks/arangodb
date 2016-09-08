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

size_t writeFunction(void* data, size_t size, size_t nmemb, void* userp) {
  size_t realsize = size * nmemb;

  Communicator::RequestInProgress* rip = (struct Communicator::RequestInProgress*) userp;
  try {
    rip->buffer->appendText((char*) data, realsize);
    return realsize;
  } catch (std::bad_alloc& ba) {
    return 0;
  }
}

Communicator::Communicator()
    : _curl(nullptr) {
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

  write(_fds[1], "", 0);

  return Ticket{id};
}

int Communicator::work_once() {
  std::vector<NewRequest> newRequests;

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    newRequests.swap(_newRequests);
  }

  for (auto const& newRequest : newRequests) {
    createRequestInProgress(newRequest);
  }
  
  int stillRunning; 
  _mc = curl_multi_perform(_curl, &stillRunning);
  if (_mc != CURLM_OK) {
    // TODO?
    return 0;
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
  return stillRunning;
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
                            newRequest._options, newRequest._ticketId,
                            std::make_unique<StringBuffer>(TRI_UNKNOWN_MEM_ZONE, false)});
  
  struct curl_slist *headers = nullptr;
  for (auto const& header: newRequest._request->headers()) {
    std::string thisHeader(header.first + ": " + header.second);
    headers = curl_slist_append(headers, thisHeader.c_str());
  }
  curl_easy_setopt(eh, CURLOPT_HTTPHEADER, headers); 
  curl_easy_setopt(eh, CURLOPT_HEADER, 0L);
  curl_easy_setopt(eh, CURLOPT_URL, newRequest._destination.url().c_str());
  curl_easy_setopt(eh, CURLOPT_PRIVATE, request.get());
  curl_easy_setopt(eh, CURLOPT_VERBOSE, 1L);
  curl_easy_setopt(eh, CURLOPT_WRITEFUNCTION, writeFunction);
  curl_easy_setopt(eh, CURLOPT_WRITEDATA, request.get());

  switch(newRequest._request->requestType()) {
    // mop: hmmm...why is this stuff in GeneralRequest? we are interested in HTTP only :S
    case GeneralRequest::RequestType::POST:
      curl_easy_setopt(eh, CURLOPT_POST, 1);
      break;
    case GeneralRequest::RequestType::PUT:
      curl_easy_setopt(eh, CURLOPT_PUT, 1);
      break;
    case GeneralRequest::RequestType::DELETE_REQ:
      curl_easy_setopt(eh, CURLOPT_CUSTOMREQUEST, "DELETE");
      break;
    case GeneralRequest::RequestType::HEAD:
      curl_easy_setopt(eh, CURLOPT_CUSTOMREQUEST, "HEAD");
      break;
    case GeneralRequest::RequestType::PATCH:
      curl_easy_setopt(eh, CURLOPT_CUSTOMREQUEST, "PATCH");
      break;
    case GeneralRequest::RequestType::OPTIONS:
      curl_easy_setopt(eh, CURLOPT_CUSTOMREQUEST, "OPTIONS");
      break;
    case GeneralRequest::RequestType::GET:
      break;
    case GeneralRequest::RequestType::VSTREAM_CRED:
    case GeneralRequest::RequestType::VSTREAM_REGISTER:
    case GeneralRequest::RequestType::VSTREAM_STATUS:
    case GeneralRequest::RequestType::ILLEGAL:
      throw std::runtime_error("Invalid request type " +  GeneralRequest::translateMethod(newRequest._request->requestType()));
      break;
  }

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
      transformResult(eh, std::move(request->buffer), dynamic_cast<HttpResponse*>(response.get()));

      if (httpStatusCode < 400) {
        request->_callbacks._onSuccess(std::move(response));
      } else {
        request->_callbacks._onError(httpStatusCode, std::move(response));
      }
      break;
    }
    case CURLE_COULDNT_CONNECT:
      request->_callbacks._onError(TRI_ERROR_CLUSTER_CONNECTION_LOST, {nullptr});
      break;

    default:
      LOG(ERR) << "Curl return " << rc;
      request->_callbacks._onError(TRI_ERROR_INTERNAL, {nullptr});
      break;
  }

  // remove request in progress
  _requestsInProgress.erase(request->_ticketId);

  // and remove easy handle
  curl_multi_remove_handle(_curl, eh);
  curl_easy_cleanup(eh);
}

void Communicator::transformResult(CURL* eh, std::unique_ptr<StringBuffer> buffer, HttpResponse* response) {
  response->body().swap(buffer.get());
}
