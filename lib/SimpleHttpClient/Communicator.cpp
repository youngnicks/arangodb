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

#include "Basics/MutexLocker.h"

using namespace arangodb;
using namespace arangodb::communicator;

namespace {
std::atomic_uint_fast64_t NEXT_TICKET_ID(static_cast<uint64_t>(0));
}

Ticket Communicator::addRequest(Destination destination,
                                std::unique_ptr<GeneralRequest> request,
                                Callbacks callbacks, Options options) {
  uint64_t id = NEXT_TICKET_ID.fetch_add(1, std::memory_order_seq_cst);

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    _newRequests.emplace_back(destination, std::move(request), callbacks,
                              options, id);
  }

  return Ticket{id};
}

void Communicator::work_once() {
  std::vector<NewRequest> newRequests;

  {
    MUTEX_LOCKER(guard, _newRequestsLock);
    newRequests.swap(_newRequests);
  }

  for (auto newRequest : newRequests) {
    uint64_t ticketId = newRequest._id;

    _requestsInProgress[ticketId] =
        createRequestInProgress(std::move(newRequest));
  }

  for (auto rip : _requestsInProgress) {
    rip._connection.run();
  }
}

RequestInProgress Communicator::createRequestInProgress(NewRequest newRequest) {
  dbinterface::Connection connection =
      ConnectionManager2.connection(newRequest._destination);

  // TODO
}
