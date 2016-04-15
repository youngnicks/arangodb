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
/// @author Jan Steemann
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGOD_INDEXES_ROCKS_DB_FEATURE_H
#define ARANGOD_INDEXES_ROCKS_DB_FEATURE_H 1

#include "Basics/Common.h"
#include "VocBase/voc-types.h"

#include <rocksdb/options.h>

namespace rocksdb {
class OptimisticTransactionDB;
}

namespace arangodb {
class RocksDBKeyComparator;

class RocksDBFeature {
 public:
  RocksDBFeature();
  ~RocksDBFeature();

  inline rocksdb::OptimisticTransactionDB* db() const { return _db; }
  inline RocksDBKeyComparator* comparator() const { return _comparator; }

  int initialize(std::string const&);
  int shutdown();

  static RocksDBFeature* instance();

  static int syncWal();
  static int dropDatabase(TRI_voc_tick_t);
  static int dropCollection(TRI_voc_tick_t, TRI_voc_cid_t);
  static int dropIndex(TRI_voc_tick_t, TRI_voc_cid_t, TRI_idx_iid_t);

 private:

  int dropPrefix(std::string const& prefix);

 private:

  rocksdb::OptimisticTransactionDB* _db;
  rocksdb::Options _options;
  RocksDBKeyComparator* _comparator;
  std::string _path;
};

}

#endif
