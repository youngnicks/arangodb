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

#ifndef ARANGOD_HTTP_SERVER_REST_STATUS_H
#define ARANGOD_HTTP_SERVER_REST_STATUS_H 1

#include "Basics/Common.h"

#include "Logger/Logger.h"

// -----------------------------------------------------------------------------
// --SECTION--                                                 RestStatusElement
// -----------------------------------------------------------------------------

namespace arangodb {
class RestStatus;

class RestStatusElement {
  friend class RestStatus;

 public:
  enum class State { DONE, FAILED, ABANDONED, QUEUED, THEN };

 public:
  RestStatusElement(State status) : _state(status), _previous(nullptr) {
    TRI_ASSERT(_state != State::THEN);
    LOG(ERR) << "RSE CONST1 (status only)";
  }

  RestStatusElement(State status, RestStatusElement const* previous,
                    std::function<RestStatus*()> callback)
      : _state(status),
        _previous(previous == nullptr ? nullptr
                                      : new RestStatusElement(*previous)),
        _callback(callback) {
    LOG(ERR) << "RSE CONST2 (const previous)";
  }

  RestStatusElement(State status, RestStatusElement* previous,
                    std::function<RestStatus*()> callback)
      : _state(status), _previous(previous), _callback(callback) {
    LOG(ERR) << "RSE CONST3 (previous)";
    printTree();
  }

  RestStatusElement(RestStatusElement const& that)
      : _state(that._state),
        _previous(that._previous == nullptr ? nullptr : new RestStatusElement(
                                                            *that._previous)),
        _callback(that._callback) {
    LOG(ERR) << "RSE CONST4 (copy)";
  }

 public:
  RestStatus* callThen() { return _callback(); }
  bool isLeaf() const { return _previous == nullptr; }
  State state() const { return _state; }
  RestStatusElement* previous() const { return _previous; }
  void printTree() const;

 private:
  RestStatusElement* then1(std::function<void()>) const;
  RestStatusElement* then1(std::function<void()>);

  RestStatusElement* then2(std::function<RestStatus()>) const;
  RestStatusElement* then2(std::function<RestStatus()>);

 private:
  State _state;
  RestStatusElement* _previous;
  std::function<RestStatus*()> _callback;
};

// -----------------------------------------------------------------------------
// --SECTION--                                                        RestStatus
// -----------------------------------------------------------------------------

class RestStatus {
 public:
  static RestStatus const ABANDON;
  static RestStatus const DONE;
  static RestStatus const FAILED;
  static RestStatus const QUEUE;

 public:
  explicit RestStatus(RestStatusElement* element) : _element(element) {
    LOG(ERR) << "RS CONST1";
  }

  RestStatus(RestStatus const& that) : _element(that._element), _free(false) {
    LOG(ERR) << "RS CONST2 (copy)";
    printTree();
  }

  RestStatus(RestStatus&& that) : _element(that._element), _free(that._free) {
    LOG(ERR) << "RS CONST3 (move)";
    that._element = nullptr;
    that._free = false;
  }

  ~RestStatus() {
    if (_free && _element != nullptr) {
      delete _element;
    }
  }

 public:
  RestStatusElement* element() const { return _element; }

  bool isLeaf() const { return _element->isLeaf(); }

  bool isFailed() const {
    return _element->_state == RestStatusElement::State::FAILED;
  }

  bool isAbandoned() const {
    return _element->_state == RestStatusElement::State::ABANDONED;
  }

  void printTree() const {
    if (_element != nullptr) {
      _element->printTree();
    } else {
      LOG(INFO) << "TREE: EMPTY";
    }
  }

 public:
  template <typename FUNC>
  auto then(FUNC func) const ->
      typename std::enable_if<std::is_void<decltype(func())>::value,
                              RestStatus>::type {
    return RestStatus(_element->then1(func));
  }

  template <typename FUNC>
  auto then(FUNC func) ->
      typename std::enable_if<std::is_void<decltype(func())>::value,
                              RestStatus&>::type {
    _element = _element->then1(func);
    _free = true;

    return *this;
  }

  template <typename FUNC>
  auto then(FUNC func) const ->
      typename std::enable_if<std::is_class<decltype(func())>::value,
                              RestStatus>::type {
    return RestStatus(_element->then2(func));
  }

  template <typename FUNC>
  auto then(FUNC func) ->
      typename std::enable_if<std::is_class<decltype(func())>::value,
                              RestStatus&>::type {
    _element = _element->then2(func);
    _free = true;

    return *this;
  }

 private:
  RestStatusElement* _element;
  bool _free = true;
};
}

#endif
