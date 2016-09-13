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
#include "Rest/HttpRequest.h"

using namespace arangodb;
using namespace arangodb::communicator;

namespace {
std::atomic_uint_fast64_t NEXT_TICKET_ID(static_cast<uint64_t>(0));
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
    throw std::runtime_error("Invalid curl multi result while performing! Result was " + std::to_string(_mc));
  }

  // handle all messages received
  CURLMsg* msg = nullptr;
  int msgsLeft = 0;

  while ((msg = curl_multi_info_read(_curl, &msgsLeft))) {
    if (msg->msg == CURLMSG_DONE) {
      CURL* handle = msg->easy_handle;

      handleResult(handle, msg->data.result);
    }
  }
  return stillRunning;
}

void Communicator::wait() {
  static int const MAX_WAIT_MSECS = 1000;  // wait max. 1 seconds

  int res = curl_multi_wait(_curl, &_wakeup, 1, MAX_WAIT_MSECS, &_numFds);
  if (res != CURLM_OK) {
    throw std::runtime_error("Invalid curl multi result while waiting! Result was " + std::to_string(res));
  }

  // drain the pipe
  char a[16];

  while (0 < read(_fds[0], a, sizeof(a))) {
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

void Communicator::createRequestInProgress(NewRequest const& newRequest) {
  auto request = (HttpRequest*) newRequest._request.get();
  auto rip = std::make_unique<RequestInProgress>(newRequest._callbacks, newRequest._ticketId, std::string(request->body().c_str(), request->body().length()));
  
  CURL* handle = curl_easy_init();
  if (handle == nullptr) {
    THROW_ARANGO_EXCEPTION(TRI_ERROR_OUT_OF_MEMORY);
  }

  struct curl_slist* requestHeaders = rip->_requestHeaders;
  
  switch(request->contentType()) {
    case ContentType::UNSET:
    case ContentType::CUSTOM:
    case ContentType::VPACK:
    case ContentType::DUMP:
      break;
    case ContentType::JSON:
      requestHeaders = curl_slist_append(requestHeaders, "Content-Type: application/json");
      break;
    case ContentType::HTML:
      requestHeaders = curl_slist_append(requestHeaders, "Content-Type: text/html");
      break;
    case ContentType::TEXT:
      requestHeaders = curl_slist_append(requestHeaders, "Content-Type: text/plain");
      break;
  }
  for (auto const& header: request->headers()) {
    std::string thisHeader(header.first + ": " + header.second);
    requestHeaders = curl_slist_append(requestHeaders, thisHeader.c_str());
  }
  curl_easy_setopt(handle, CURLOPT_HTTPHEADER, requestHeaders); 
  curl_easy_setopt(handle, CURLOPT_HEADER, 0L);
  curl_easy_setopt(handle, CURLOPT_URL, newRequest._destination.url().c_str());
  curl_easy_setopt(handle, CURLOPT_PRIVATE, rip.get());
  curl_easy_setopt(handle, CURLOPT_VERBOSE, 1L);
  curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, Communicator::readBody);
  curl_easy_setopt(handle, CURLOPT_WRITEDATA, rip.get());
  curl_easy_setopt(handle, CURLOPT_HEADERFUNCTION, Communicator::readHeaders);
  curl_easy_setopt(handle, CURLOPT_HEADERDATA, rip.get());
  curl_easy_setopt(handle, CURLOPT_DEBUGFUNCTION, Communicator::curlDebug);
  curl_easy_setopt(handle, CURLOPT_DEBUGDATA, rip.get());

  curl_easy_setopt(handle, CURLOPT_TIMEOUT_MS, static_cast<long>(newRequest._options.requestTimeout * 1000));
  long connectTimeout = static_cast<long>(newRequest._options.connectionTimeout);
  if (connectTimeout < 1) {
    connectTimeout = 1;
  }
  curl_easy_setopt(handle, CURLOPT_CONNECTTIMEOUT, connectTimeout);

  switch(request->requestType()) {
    // mop: hmmm...why is this stuff in GeneralRequest? we are interested in HTTP only :S
    case RequestType::POST:
      curl_easy_setopt(handle, CURLOPT_POST, 1);
      break;
    case RequestType::PUT:
      // mop: apparently CURLOPT_PUT implies more stuff in curl
      // (for example it adds an expect 100 header)
      // this is not what we want so we make it a custom request
      curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "PUT");
      break;
    case RequestType::DELETE_REQ:
      curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "DELETE");
      break;
    case RequestType::HEAD:
      curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "HEAD");
      break;
    case RequestType::PATCH:
      curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "PATCH");
      break;
    case RequestType::OPTIONS:
      curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, "OPTIONS");
      break;
    case RequestType::GET:
      break;
    case RequestType::VSTREAM_CRED:
    case RequestType::VSTREAM_REGISTER:
    case RequestType::VSTREAM_STATUS:
    case RequestType::ILLEGAL:
      throw std::runtime_error("Invalid request type " +  GeneralRequest::translateMethod(request->requestType()));
      break;
  }
  
  if (request->body().length() > 0) {
    curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, rip->_requestBody.length());
    curl_easy_setopt(handle, CURLOPT_POSTFIELDS, rip->_requestBody.c_str());
  }
  
  try {
    _requestsInProgress.emplace(newRequest._ticketId, std::move(rip));
    curl_multi_add_handle(_curl, handle);
  } catch (std::bad_alloc const& e) {
    curl_easy_cleanup(handle);
  }
}

void Communicator::handleResult(CURL* handle, CURLcode rc) {
  RequestInProgress* request = nullptr;
  curl_easy_getinfo(handle, CURLINFO_PRIVATE, &request);
  if (request == nullptr) {
    cleanMultiHandle(handle);
    return;
  }
  
  switch (rc) {
    case CURLE_OK: {
      long httpStatusCode = 200;
      curl_easy_getinfo(handle, CURLINFO_RESPONSE_CODE, &httpStatusCode);

      std::unique_ptr<GeneralResponse> response(new HttpResponse(
          static_cast<ResponseCode>(httpStatusCode)));

      transformResult(handle, std::move(request->_responseHeaders), std::move(request->_responseBody), dynamic_cast<HttpResponse*>(response.get()));

      if (httpStatusCode < 400) {
        request->_callbacks._onSuccess(std::move(response));
      } else {
        request->_callbacks._onError(httpStatusCode, std::move(response));
      }
      break;
    }
    case CURLE_COULDNT_CONNECT:
    case CURLE_COULDNT_RESOLVE_HOST:
      request->_callbacks._onError(TRI_SIMPLE_CLIENT_COULD_NOT_CONNECT, {nullptr});
      break;

    default:
      LOG(ERR) << "Curl return " << rc;
      request->_callbacks._onError(TRI_ERROR_INTERNAL, {nullptr});
      break;
  }

  cleanMultiHandle(handle);
  
  // remove request in progress
  _requestsInProgress.erase(request->_ticketId);
}

void Communicator::cleanMultiHandle(CURL* handle) {
  // and remove easy handle
  curl_multi_remove_handle(_curl, handle);
  curl_easy_cleanup(handle);
}

void Communicator::transformResult(CURL* handle, HeadersInProgress&& responseHeaders, std::unique_ptr<StringBuffer> responseBody, HttpResponse* response) {
  response->body().swap(responseBody.get());
  response->setHeaders(std::move(responseHeaders));
  responseBody.release();
}

size_t Communicator::readBody(void* data, size_t size, size_t nitems, void* userp) {
  size_t realsize = size * nitems;

  Communicator::RequestInProgress* rip = (struct Communicator::RequestInProgress*) userp;
  try {
    rip->_responseBody->appendText((char*) data, realsize);
    return realsize;
  } catch (std::bad_alloc& ba) {
    return 0;
  }
}

void Communicator::logHttpBody(std::string const& prefix, std::string const& data) {
  std::string::size_type n = 0;
  while (n < data.length()) {
    LOG_TOPIC(DEBUG, Logger::REQUESTS) << prefix << " " << data.substr(n, 80);
    n += 80;
  }
}

void Communicator::logHttpHeaders(std::string const& prefix, std::string const& headerData) {
  std::string::size_type last = 0;
  std::string::size_type n;
  while (true) {
    n = headerData.find("\r\n", last);
    if (n == std::string::npos) {
      break;
    }
    LOG_TOPIC(DEBUG, Logger::REQUESTS) << prefix << " " << headerData.substr(last, n - last);
    last = n + 2;
  }
}

int Communicator::curlDebug(CURL *handle, curl_infotype type, char *data, size_t size, void *userptr) {
  arangodb::communicator::Communicator::RequestInProgress* request = nullptr;
  curl_easy_getinfo(handle, CURLINFO_PRIVATE, &request);
  TRI_ASSERT(request != nullptr);
  TRI_ASSERT(data != nullptr);
  
  std::string dataStr(data, size);
  std::string prefix("Communicator("  + std::to_string(request->_ticketId) + ") // ");
  
  switch (type) {
    case CURLINFO_TEXT:
      LOG_TOPIC(TRACE, Logger::REQUESTS) << prefix << "Text: " << dataStr;
      break;
    case CURLINFO_HEADER_OUT:
      logHttpHeaders(prefix + "Header >>", dataStr); 
      break;
    case CURLINFO_HEADER_IN:
      logHttpHeaders(prefix + "Header <<", dataStr); 
      break;
    case CURLINFO_DATA_OUT:
    case CURLINFO_SSL_DATA_OUT:
      logHttpBody(prefix + "Body >>", dataStr);
      break;
    case CURLINFO_DATA_IN:
    case CURLINFO_SSL_DATA_IN:
      logHttpBody(prefix + "Body <<", dataStr);
      break;
    case CURLINFO_END:
      break;
  }
  return 0;
}

size_t Communicator::readHeaders(char* buffer, size_t size, size_t nitems, void* userptr) {
  size_t realsize = size * nitems;
  Communicator::RequestInProgress* rip = (struct Communicator::RequestInProgress*) userptr;
  
  std::string const header(buffer, realsize);
  size_t pivot = header.find_first_of(':');
  if (pivot != std::string::npos) {
    // mop: hmm response needs lowercased headers
    std::string headerKey = basics::StringUtils::tolower(std::string(header.c_str(), pivot));
    rip->_responseHeaders.emplace(headerKey, header.substr(pivot + 2, header.length() - pivot -4));
  }
  return realsize;
}
