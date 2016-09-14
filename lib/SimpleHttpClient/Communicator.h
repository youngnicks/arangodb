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

#ifndef ARANGODB_SIMPLE_HTTP_CLIENT_COMMUNICATOR_H
#define ARANGODB_SIMPLE_HTTP_CLIENT_COMMUNICATOR_H 1

#include "curl/curl.h"

#include "Basics/Common.h"
#include "Basics/Mutex.h"
#include "Basics/StringBuffer.h"
#include "Rest/GeneralRequest.h"
#include "Rest/HttpResponse.h"
#include "SimpleHttpClient/Callbacks.h"
#include "SimpleHttpClient/Destination.h"
#include "SimpleHttpClient/Options.h"
#include "SimpleHttpClient/Ticket.h"

namespace arangodb {
using namespace basics;
namespace communicator {
  typedef std::unordered_map<std::string, std::string> HeadersInProgress;

  struct RequestInProgress {
    RequestInProgress(Callbacks callbacks, uint64_t ticketId, std::string const& requestBody)
      : _callbacks(callbacks), _ticketId(ticketId), _requestBody(requestBody), _requestHeaders(nullptr), _responseBody(new StringBuffer(TRI_UNKNOWN_MEM_ZONE, false)) {
      }

    ~RequestInProgress() {
      if (_requestHeaders != nullptr) {
        curl_slist_free_all(_requestHeaders);
      }
    }

    RequestInProgress(RequestInProgress const& other) = delete;
    RequestInProgress& operator=(RequestInProgress const& other) = delete;

    Callbacks _callbacks;
    uint64_t _ticketId;
    std::string _requestBody;
    struct curl_slist* _requestHeaders;

    HeadersInProgress _responseHeaders;
    std::unique_ptr<StringBuffer> _responseBody;
  };
}
}

namespace std {
template <>
class default_delete<CURL> {
 public:
  void operator()(CURL* handle) {
    if (handle != nullptr) {
      arangodb::communicator::RequestInProgress* request = nullptr;
      curl_easy_getinfo(handle, CURLINFO_PRIVATE, &request);
      TRI_ASSERT(request != nullptr);
      // mop: without assertions we should continue operation but free safely
      if (request != nullptr) {
        delete request;
      }
      curl_easy_cleanup(handle);
    }
  }
};
}

namespace arangodb {
using namespace basics;

namespace communicator {

class Communicator {
 public:
  Communicator();

 public:
  Ticket addRequest(Destination, std::unique_ptr<GeneralRequest>, Callbacks,
                    Options);

  int work_once();
  void wait();
 
 public:

 private:
  struct NewRequest {
    Destination _destination;
    std::unique_ptr<GeneralRequest> _request;
    Callbacks _callbacks;
    Options _options;
    uint64_t _ticketId;
  };

  struct CurlData {
  };

 private:
  Mutex _newRequestsLock;
  std::vector<NewRequest> _newRequests;
  std::unordered_map<uint64_t, std::unique_ptr<CURL>>
      _handlesInProgress;
  CURLM* _curl;
  CURLMcode _mc;
  curl_waitfd _wakeup;

  int _fds[2];
  int _numFds;

 private:
  void createRequestInProgress(NewRequest const& newRequest);
  void handleResult(CURL*, CURLcode);
  void transformResult(CURL*, HeadersInProgress&&, std::unique_ptr<StringBuffer>, HttpResponse*);
 
 private:
  static size_t readBody(void*, size_t, size_t, void*);
  static size_t readHeaders(char* buffer, size_t size, size_t nitems, void* userdata);
  static int curlDebug(CURL*, curl_infotype, char*, size_t, void*);
  static void logHttpHeaders(std::string const&, std::string const&);
  static void logHttpBody(std::string const&, std::string const&);
};
}
}

#endif
