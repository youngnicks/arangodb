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
/// @author Dr. Frank Celler
////////////////////////////////////////////////////////////////////////////////

#include "RestEngine.h"

#include "GeneralServer/RestHandler.h"
#include "Logger/Logger.h"

using namespace arangodb;
using namespace arangodb::rest;

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

RestEngine::RestEngine() {}

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void RestEngine::init() {}

void RestEngine::run(WorkItem::uptr<rest::RestHandler> handler) {
  while (true) {
    LOG(ERR) << "HALLO";

    switch (_state) {
      case State::PREPARE: {
        int res = handler->prepareEngine(this);

        if (res != TRI_ERROR_NO_ERROR) {
          return;
        }

        continue;
      }

      case State::EXECUTE: {
        int res = handler->executeEngine(this);

        if (res != TRI_ERROR_NO_ERROR) {
          return;
        }

        continue;
      }

      case State::RUN: {
        int res = handler->runEngine(this);

        if (res != TRI_ERROR_NO_ERROR) {
          return;
        }

        return;
      }

      case State::FINALIZE: {
        int res = handler->finalizeEngine(this);

        if (res != TRI_ERROR_NO_ERROR) {
          return;
        }

        continue;
      }

      case State::DONE:
      case State::FAILED:
        return;
    }
  }
}

RestStatus RestEngine::syncRun() {}

void RestEngine::appendRestStatus(std::unique_ptr<RestStatus> status) {
  RestStatusElement* element = status->element();
  _statusEntries.push_back(status.release());

  while (element != nullptr) {
    _elements.push_back(element);
    element = element->previous();
  }
}
