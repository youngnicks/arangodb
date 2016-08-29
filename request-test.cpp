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

Communicator c;

auto unexpectedErrorFn = [](int errorCode, std::unique_ptr<GeneralResponse> response) {
  std::string errorMsg("Unexpected error: " + std::to_string(errorCode));
  if (response) {
    errorMsg += ". HTTP: " + GeneralResponse::responseString(response->responseCode()) + ": " + std::string(response->body().c_str(), response->body().length());
  }
  throw std::runtime_error(errorMsg);
};

auto unexpectedSuccessFn = [](std::unique_ptr<GeneralResponse> response) {
  std::string errorMsg("Unexpected success. HTTP: " + GeneralResponse::responseString(response->responseCode()) + ": " + std::string(response->body().c_str(), response->body().length()));
  throw std::runtime_error(errorMsg);
};

void connectionRefusedTest() {
  std::unique_ptr<GeneralRequest> request(new HttpRequest());

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
      ._onSuccess = unexpectedSuccessFn
  };

  communicator::Options opt;
  c.addRequest(communicator::Destination{"http://localhost:12121/_api/version"},
               std::move(request), callbacks, opt);
}

void simpleGetTest() {
  std::unique_ptr<GeneralRequest> request(new HttpRequest());

  communicator::Callbacks callbacks{
      ._onError = unexpectedErrorFn,
      ._onSuccess =
          [](std::unique_ptr<GeneralResponse> response) {
            std::string body(response->body().c_str(), response->body().length());
            std::string check = body.substr(0, 18);
            if (check != "{\"server\":\"arango\"") {
              throw std::runtime_error("Excpected arangodb server response. Got " + check);
            }
          }};

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/version"},
               std::move(request), callbacks, opt);
}
  
void sendHeadersTest() {
  std::unique_ptr<GeneralRequest> request(new HttpRequest());
  ((HttpRequest*)request.get())->setHeader("Content-Type", 12, "wurst/curry", 11);
  ((HttpRequest*)request.get())->setRequestType(GeneralRequest::RequestType::POST);
  
  communicator::Callbacks callbacks{
      ._onError = unexpectedErrorFn,
      ._onSuccess = unexpectedSuccessFn
  };

  communicator::Options opt;

  c.addRequest(communicator::Destination{"http://localhost:8529/_api/document/hansmann"},
               std::move(request), callbacks, opt);
}

int main() {
  std::atomic<bool> stopThread {false};
  std::atomic<int> numTasks {0};
  std::atomic<int> tasksDone {0};

  connectionRefusedTest();
  simpleGetTest();
  sendHeadersTest();
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
