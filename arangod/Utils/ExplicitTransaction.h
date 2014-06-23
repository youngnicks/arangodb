////////////////////////////////////////////////////////////////////////////////
/// @brief wrapper for explicit transactions
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2014 ArangoDB GmbH, Cologne, Germany
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
/// @author Jan Steemann
/// @author Copyright 2014, ArangoDB GmbH, Cologne, Germany
/// @author Copyright 2011-2013, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGODB_UTILS_EXPLICIT_TRANSACTION_H
#define ARANGODB_UTILS_EXPLICIT_TRANSACTION_H 1

#include "Basics/Common.h"

#include "Utils/Transaction.h"
#include "VocBase/server.h"
#include "VocBase/transaction.h"

struct TRI_vocbase_s;

namespace triagens {
  namespace arango {

    template<typename T>
    class ExplicitTransaction : public Transaction<T> {

// -----------------------------------------------------------------------------
// --SECTION--                                         class ExplicitTransaction
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

      public:

////////////////////////////////////////////////////////////////////////////////
/// @brief create the transaction
////////////////////////////////////////////////////////////////////////////////

        ExplicitTransaction (struct TRI_vocbase_s* vocbase,
                             std::vector<std::string> const& readCollections,
                             std::vector<std::string> const& writeCollections,
                             double lockTimeout,
                             bool waitForSync,
                             bool doReplicate) :
          Transaction<T>(vocbase, TRI_GetIdServer(), doReplicate) {

          this->addHint(TRI_TRANSACTION_HINT_LOCK_ENTIRELY);

          if (lockTimeout >= 0.0) {
            this->setTimeout(lockTimeout);
          }

          if (waitForSync) {
            this->setWaitForSync();
          }

          for (size_t i = 0; i < readCollections.size(); ++i) {
            this->addCollection(readCollections[i], TRI_TRANSACTION_READ);
          }

          for (size_t i = 0; i < writeCollections.size(); ++i) {
            this->addCollection(writeCollections[i], TRI_TRANSACTION_WRITE);
          }
        }

////////////////////////////////////////////////////////////////////////////////
/// @brief end the transaction
////////////////////////////////////////////////////////////////////////////////

        ~ExplicitTransaction () {
        }

    };

  }
}

#endif

// -----------------------------------------------------------------------------
// --SECTION--                                                       END-OF-FILE
// -----------------------------------------------------------------------------

// Local Variables:
// mode: outline-minor
// outline-regexp: "/// @brief\\|/// {@inheritDoc}\\|/// @page\\|// --SECTION--\\|/// @\\}"
// End:
