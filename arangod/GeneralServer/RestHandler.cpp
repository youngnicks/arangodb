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
////////////////////////////////////////////////////////////////////////////////

#include "RestHandler.h"

#include <velocypack/Exception.h>

#include "Basics/StringUtils.h"
#include "Logger/Logger.h"
#include "Rest/GeneralRequest.h"

using namespace arangodb;
using namespace arangodb::basics;
using namespace arangodb::rest;

namespace {
std::atomic_uint_fast64_t NEXT_HANDLER_ID(
    static_cast<uint64_t>(TRI_microtime() * 100000.0));
}

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

RestHandler::RestHandler(GeneralRequest* request, GeneralResponse* response)
    : _handlerId(NEXT_HANDLER_ID.fetch_add(1, std::memory_order_seq_cst)),
      _canceled(false),
      _request(request),
      _response(response) {
  bool found;
  std::string const& startThread =
      _request->header(StaticStrings::StartThread, found);

  if (found) {
    _needsOwnThread = StringUtils::boolean(startThread);
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void RestHandler::setTaskId(uint64_t id) { _taskId = id; }

int RestHandler::prepareEngine(RestEngine* engine) {
  requestStatisticsAgentSetRequestStart();

#ifdef USE_DEV_TIMERS
  TRI_request_statistics_t::STATS = _statistics;
#endif

  if (_canceled) {
    engine->setState(RestEngine::State::DONE);
    requestStatisticsAgentSetExecuteError();

    Exception err(TRI_ERROR_REQUEST_CANCELED,
                  "request has been canceled by user", __FILE__, __LINE__);
    handleError(err);

    engine->processResult(this);
    return TRI_ERROR_REQUEST_CANCELED;
  }

  try {
    prepareExecute();
    engine->setState(RestEngine::State::EXECUTE);
    return TRI_ERROR_NO_ERROR;
  } catch (Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception: " << DIAGNOSTIC_INFORMATION(ex);
  } catch (std::exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception: " << ex.what();
  } catch (...) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception";
  }

  engine->setState(RestEngine::State::FAILED);
  engine->processResult(this);
  return TRI_ERROR_INTERNAL;
}

int RestHandler::finalizeEngine(RestEngine* engine) {
  int res = TRI_ERROR_NO_ERROR;

  try {
    finalizeExecute();
  } catch (Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception: " << DIAGNOSTIC_INFORMATION(ex);
    res = TRI_ERROR_INTERNAL;
  } catch (std::exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception: " << ex.what();
    res = TRI_ERROR_INTERNAL;
  } catch (...) {
    requestStatisticsAgentSetExecuteError();
    LOG(ERR) << "caught exception";
    res = TRI_ERROR_INTERNAL;
  }

  if (res == TRI_ERROR_NO_ERROR) {
    engine->setState(RestEngine::State::DONE);
  } else {
    engine->setState(RestEngine::State::FAILED);
  }

  requestStatisticsAgentSetRequestEnd();

#ifdef USE_DEV_TIMERS
  TRI_request_statistics_t::STATS = nullptr;
#endif

  engine->processResult(this);

  return res;
}

int RestHandler::executeEngine(RestEngine* engine) {
  try {
    RestStatus result = execute();

    LOG(ERR) << "AAAAAAAAAAAAAAAAAAAAAAAAA";
    result.printTree();
    LOG(ERR) << "AAAAAAAAAAAAAAAAAAAAAAAAA";

    if (result.isLeaf()) {
      if (!result.isAbandoned() && _response == nullptr) {
        Exception err(TRI_ERROR_INTERNAL, "no response received from handler",
                      __FILE__, __LINE__);

        handleError(err);
      }

      engine->setState(RestEngine::State::FINALIZE);
      engine->processResult(this);
      return TRI_ERROR_NO_ERROR;
    }

    engine->setState(RestEngine::State::RUN);
    engine->appendRestStatus(result.element());

    return TRI_ERROR_NO_ERROR;
  } catch (Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    handleError(ex);
  } catch (arangodb::velocypack::Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, std::string("VPack error: ") + ex.what(),
                  __FILE__, __LINE__);
    handleError(err);
  } catch (std::bad_alloc const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_OUT_OF_MEMORY, ex.what(), __FILE__, __LINE__);
    handleError(err);
  } catch (std::exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, ex.what(), __FILE__, __LINE__);
    handleError(err);
  } catch (...) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, __FILE__, __LINE__);
    handleError(err);
  }

  engine->setState(RestEngine::State::FAILED);
  engine->processResult(this);
  return TRI_ERROR_INTERNAL;
}

int RestHandler::runEngine(RestEngine* engine) {
  try {
    while (engine->hasSteps()) {
      std::shared_ptr<RestStatusElement> result = engine->popStep();

      switch (result->state()) {
        case RestStatusElement::State::DONE:
          engine->processResult(this);
          break;

        case RestStatusElement::State::FAILED:
          engine->setState(RestEngine::State::FINALIZE);
          engine->processResult(this);
          return TRI_ERROR_NO_ERROR;

        case RestStatusElement::State::ABANDONED:
          // do nothing
          break;

        case RestStatusElement::State::QUEUED:
          engine->queue([this, engine]() {
            engine->run(this);
          });

          return TRI_ERROR_NO_ERROR;

        case RestStatusElement::State::THEN: {
          auto status = result->callThen();

          if (status != nullptr) {
            engine->appendRestStatus(status->element());
          }

          break;
        }
      }
    }

    return TRI_ERROR_NO_ERROR;
  } catch (Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    handleError(ex);
  } catch (arangodb::velocypack::Exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, std::string("VPack error: ") + ex.what(),
                  __FILE__, __LINE__);
    handleError(err);
  } catch (std::bad_alloc const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_OUT_OF_MEMORY, ex.what(), __FILE__, __LINE__);
    handleError(err);
  } catch (std::exception const& ex) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, ex.what(), __FILE__, __LINE__);
    handleError(err);
  } catch (...) {
    requestStatisticsAgentSetExecuteError();
    Exception err(TRI_ERROR_INTERNAL, __FILE__, __LINE__);
    handleError(err);
  }

  engine->setState(RestEngine::State::FAILED);
  engine->processResult(this);
  return TRI_ERROR_INTERNAL;
}

// -----------------------------------------------------------------------------
// --SECTION--                                                 protected
// methods
// -----------------------------------------------------------------------------

void RestHandler::resetResponse(rest::ResponseCode code) {
  TRI_ASSERT(_response != nullptr);
  _response->reset(code);
}
