#include <atomic>
#include <iostream>
#include <thread>
#include <functional>

#include "Rest/GeneralRequest.h"
#include "Rest/HttpRequest.h"
#include "Rest/HttpResponse.h"
#include "SimpleHttpClient/Communicator.h"

using namespace arangodb;
using namespace arangodb::communicator;

std::unique_ptr<HttpRequest> createRequest() {
  HttpRequest* request = HttpRequest::createHttpRequest(ContentType::UNSET, "", 0, std::unordered_map<std::string, std::string> {});
  request->setRequestType(RequestType::GET);
  return std::unique_ptr<HttpRequest>(request);
}

std::function<void(int, std::unique_ptr<GeneralResponse>)> createUnexpectedError(std::string const& name) {
  return [name](int errorCode, std::unique_ptr<GeneralResponse> response) {
    std::string errorMsg("Unexpected error in " + name + ": " + std::to_string(errorCode));
    if (response) {
      errorMsg += ". HTTP: " + GeneralResponse::responseString(((HttpResponse*)response.get())->responseCode()) + ": " + std::string(((HttpResponse*)response.get())->body().c_str(), ((HttpResponse*)response.get())->body().length());
    }
    throw std::runtime_error(errorMsg);
  };
}

std::function<void(std::unique_ptr<GeneralResponse>)> createUnexpectedSuccess(std::string const& name) {
  return [name](std::unique_ptr<GeneralResponse> response) {
    std::string errorMsg("Unexpected success in " + name);
    errorMsg += ". HTTP: " + GeneralResponse::responseString(response->responseCode()) + ": " + std::string(((HttpResponse*)response.get())->body().c_str(), ((HttpResponse*)response.get())->body().length());
    throw std::runtime_error(errorMsg);
  };
}

Communicator c;

void connectionRefusedTest() {
  auto request = createRequest();

  communicator::Callbacks callbacks{
      ._onError = 
          [](int errorCode, std::unique_ptr<GeneralResponse> response) {
            if (errorCode != TRI_ERROR_CLUSTER_CONNECTION_LOST) {
              throw std::runtime_error("Errorcode is supposed to be " + std::to_string(TRI_ERROR_CLUSTER_CONNECTION_LOST) + ". But is " + std::to_string(errorCode));
            }

            if (response.get() != nullptr) {
              throw std::runtime_error("Response is not null!");
            }
          },
      ._onSuccess = createUnexpectedSuccess(__func__)
  };

  communicator::Options opt;
  c.addRequest(communicator::Destination{"http://localhost:12121/_api/version"},
               std::move(request), callbacks, opt);
}

void simpleGetTest() {
  auto request = createRequest();

  communicator::Callbacks callbacks{
      ._onError = createUnexpectedError(__func__),
      ._onSuccess =
          [](std::unique_ptr<GeneralResponse> response) {
            std::string body(((HttpResponse*)response.get())->body().c_str(), ((HttpResponse*)response.get())->body().length());
            std::string check = body.substr(0, 18);
            if (check != "{\"server\":\"arango\"") {
              throw std::runtime_error("Excpected arangodb server response. Got " + check);
            }
          }};

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/version"},
               std::move(request), callbacks, opt);
}
  
void simplePostTest() {
  auto request = createRequest();
  request->setRequestType(RequestType::POST);

  std::string body("{\"hasi\": \"hosi\"}");
  request->setBody(body.c_str(), body.length());
  
  std::string funcName(__func__);
  communicator::Callbacks callbacks {
      ._onError = [funcName](int errorCode, std::unique_ptr<GeneralResponse> response) {
        if (response->responseCode() != ResponseCode::BAD) {
          throw std::runtime_error("Got invalid response in " + funcName + ": " + GeneralResponse::responseString(response->responseCode()));
        }
      },
      ._onSuccess = createUnexpectedSuccess(__func__)
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/collection"},
               std::move(request), callbacks, opt);
}

void simplePostBodyTest() {
  auto request = createRequest();
  request->setRequestType(RequestType::POST);

  std::string body("return {hase: true}");
  request->setBody(body.c_str(), body.length());

  std::string funcName(__func__);
  communicator::Callbacks callbacks {
      ._onError = createUnexpectedError(__func__),
      ._onSuccess = [funcName](std::unique_ptr<GeneralResponse> response) {
        if (response->responseCode() != ResponseCode::OK) {
          throw std::runtime_error("Got invalid response in " + funcName + ": " + GeneralResponse::responseString(response->responseCode()));
        }
        
        std::string body(((HttpResponse*)response.get())->body().c_str(), ((HttpResponse*)response.get())->body().length());
        if (body != "{\"hase\":true,\"error\":false,\"code\":200}") {
          throw std::runtime_error("Got invalid response in " + funcName + ": Expecting hase in body but body was " + body);
        }
      }
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_admin/execute?returnAsJSON=true"},
               std::move(request), callbacks, opt);
}

void sendHeadersTest() {
  auto request = createRequest();
  request->setHeader("x-arango-async", 14, "true", 4);

  std::string funcName(__func__);
  communicator::Callbacks callbacks {
      ._onError = createUnexpectedError(__func__),
      ._onSuccess = [funcName](std::unique_ptr<GeneralResponse> response) {
        if (response->responseCode() != ResponseCode::ACCEPTED) {
          throw std::runtime_error("Got invalid response in " + funcName + ": " + GeneralResponse::responseString(response->responseCode()));
        }
      }
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/collection"},
               std::move(request), callbacks, opt);
}

void receiveHeadersTest() {
  auto request = createRequest();
  std::string const origin { "http://der.bunte.hund" };
  request->setHeader("Origin", origin);

  std::string funcName(__func__);
  communicator::Callbacks callbacks {
      ._onError = createUnexpectedError(__func__),
      ._onSuccess = [funcName, origin](std::unique_ptr<GeneralResponse> response) {
        auto headers = response->headers();
        auto it = headers.find("access-control-allow-origin");
        if (it == headers.end()) {
          throw std::runtime_error("Got invalid response in " + funcName + ": Origin header is not present. " + std::to_string(headers.size()));
        }
        
        if (it->second != origin) {
          throw std::runtime_error("Got invalid response in " + funcName + ": Origin header is " + it->second + " HUIU " + origin);
        }
      }
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/collection"},
               std::move(request), callbacks, opt);
}

void failOnError() {
  auto request = createRequest();
  request->setRequestType(RequestType::POST);

  std::string body("{\"hasi\": \"hosi\"}");
  request->setBody(body.c_str(), body.length());
  
  std::string funcName(__func__);
  communicator::Callbacks callbacks {
      ._onError = [funcName](int errorCode, std::unique_ptr<GeneralResponse> response) {
        LOG(ERR) << "ERRORCODE IS " << errorCode;
        if (response->responseCode() != ResponseCode::BAD) {
          throw std::runtime_error("Got invalid response in " + funcName + ": " + GeneralResponse::responseString(response->responseCode()));
        }
      },
      ._onSuccess = createUnexpectedSuccess(__func__)
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/collection"},
               std::move(request), callbacks, opt);
}

int main() {
  Logger::setLogLevel("REQUESTS=DEBUG");
  std::atomic<bool> stopThread {false};
  std::atomic<int> numTasks {0};
  std::atomic<int> tasksDone {0};

  connectionRefusedTest();
  simpleGetTest();
  simplePostTest();
  simplePostBodyTest();
  sendHeadersTest();
  receiveHeadersTest();
  failOnError();

  int stillRunning;
  try {
    do {
      stillRunning = c.work_once();
      c.wait();
      std::cout << "AFTER WAIT IN NOOP LOOP" << std::endl;
    } while(stillRunning > 0);
    std::cout << "All good" << std::endl;
  } catch (std::exception const& e) {
    std::cout << "Exception " << e.what() << std::endl;
  }
}
