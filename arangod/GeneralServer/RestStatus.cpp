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

#include "RestStatus.h"

#include "Logger/Logger.h"

using namespace arangodb;

// -----------------------------------------------------------------------------
// --SECTION--                                                    static members
// -----------------------------------------------------------------------------

RestStatus const RestStatus::ABANDON(
    new RestStatusElement(RestStatusElement::State::ABANDONED));

RestStatus const RestStatus::DONE(
    new RestStatusElement(RestStatusElement::State::DONE));

RestStatus const RestStatus::FAILED(
    new RestStatusElement(RestStatusElement::State::FAILED));

RestStatus const RestStatus::QUEUE(
    new RestStatusElement(RestStatusElement::State::QUEUED));

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void RestStatusElement::printTree() const {
  std::string s = "TREE: ";
  std::string sep = "";
  RestStatusElement const* element = this;

  while (element != nullptr) {
    s += sep;

    switch (element->_state) {
      case State::DONE:
        s += "DONE";
        break;

      case State::FAILED:
        s += "FAILED";
        break;

      case State::ABANDONED:
        s += "ABANDONED";
        break;

      case State::QUEUED:
        s += "QUEUED";
        break;

      case State::THEN:
        s += "THEN";
        break;
    }

    sep = " -> ";

    element = element->_previous;
  }

  LOG(INFO) << s;
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

RestStatusElement* RestStatusElement::then1(
    std::function<void()> callback) const {
  LOG(ERR) << "STATUS then1.a";
  printTree();

  return new RestStatusElement(State::THEN, this, [callback]() {
    callback();
    return nullptr;
  });
}

RestStatusElement* RestStatusElement::then1(std::function<void()> callback) {
  LOG(ERR) << "STATUS then1.b";
  printTree();

  return new RestStatusElement(State::THEN, this, [callback]() {
    callback();
    return nullptr;
  });
}

RestStatusElement* RestStatusElement::then2(
    std::function<RestStatus()> callback) const {
  LOG(ERR) << "STATUS then2.a";
  printTree();

  return new RestStatusElement(
      State::THEN, this, [callback]() { return new RestStatus(callback()); });
}

RestStatusElement* RestStatusElement::then2(
    std::function<RestStatus()> callback) {
  LOG(ERR) << "STATUS then2.b";
  printTree();

  return new RestStatusElement(
      State::THEN, this, [callback]() { return new RestStatus(callback()); });
}
