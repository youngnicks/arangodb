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

#include "RocksDBFeature.h"
#include "Basics/FileUtils.h"
#include "Indexes/RocksDBKeyComparator.h"
#include "Logger/Logger.h"

#include <rocksdb/db.h>

using namespace arangodb;

static RocksDBFeature* Instance = nullptr;

RocksDBFeature::RocksDBFeature()
    : _db(nullptr), _comparator(nullptr) {}

RocksDBFeature::~RocksDBFeature() {
  delete _db;
  delete _comparator;
}

int RocksDBFeature::initialize(std::string const& path) {
  LOG(INFO) << "initializing rocksdb";
    
  _path = arangodb::basics::FileUtils::buildFilename(path, "rocksdb");
  if (!arangodb::basics::FileUtils::isDirectory(_path)) {
    std::string systemErrorStr;
    long errorNo;
    bool res = TRI_CreateRecursiveDirectory(_path.c_str(), errorNo,
                                            systemErrorStr);

    if (res) {
      LOG(INFO) << "created rocksdb directory '" << _path << "'";
    } else {
      LOG(FATAL) << "unable to create rocksdb directory: " << systemErrorStr;
      return TRI_ERROR_INTERNAL;
    }
  }

  _comparator = new RocksDBKeyComparator();

  rocksdb::Options options;
  options.create_if_missing = true;
  options.max_open_files = -1;
  options.comparator = _comparator;
  
  //options.block_cache = rocksdb::NewLRUCache(100 * 1048576); // 100MB uncompressed cache
  //options.block_cache_compressed = rocksdb::NewLRUCache(100 * 1048576); // 100MB compressed cache
  //options.filter_policy = NewBloomFilter(10);
  //options.compression = rocksdb::kLZ4Compression;
  //options.write_buffer_size = 32 << 20;
  //options.max_write_buffer_number = 2;
  //options.min_write_buffer_number_to_merge = 1;
  //options.disableDataSync = 1;
  //options.bytes_per_sync = 2 << 20;

  //options.env->SetBackgroundThreads(num_threads, Env::Priority::HIGH);
  //options.env->SetBackgroundThreads(num_threads, Env::Priority::LOW);

  rocksdb::Status status = rocksdb::DB::Open(options, _path, &_db);
  
  if (! status.ok()) {
    return TRI_ERROR_INTERNAL;
  }

  return TRI_ERROR_NO_ERROR;
}

int RocksDBFeature::shutdown() {
  LOG(INFO) << "shutting down rocksdb";
  return TRI_ERROR_NO_ERROR;
}

RocksDBFeature* RocksDBFeature::instance() {
  if (Instance == nullptr) {
    Instance = new RocksDBFeature();
  }
  return Instance;
}

