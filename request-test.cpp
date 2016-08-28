#include <atomic>
#include <iostream>
#include <thread>
#include <functional>

#include "Rest/HttpRequest.h"
#include "Rest/HttpResponse.h"
#include "SimpleHttpClient/Communicator.h"

using namespace arangodb;

communicator::Communicator c;
void simpleGetTest() {
  std::unique_ptr<GeneralRequest> request(new HttpRequest());

  communicator::Callbacks callbacks{
      ._onError =
          [](int ec, std::unique_ptr<GeneralResponse> response) {
            std::cout << "ERROR" << std::endl;
          },
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
  //((HttpRequest*)request.get())->setHeader("hans", 4, "wurst", 5);
}

int main() {
  std::atomic<bool> stopThread {false};
  std::atomic<int> numTasks {0};
  std::atomic<int> tasksDone {0};

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
