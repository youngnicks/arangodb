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

#include "RocksDBKeyComparator.h"
#include "Basics/VelocyPackHelper.h"
#include "Indexes/Index.h"
#include "Logger/Logger.h"

#include <rocksdb/db.h>
#include <rocksdb/comparator.h>
#include <iostream>

using namespace arangodb;

int RocksDBKeyComparator::Compare(rocksdb::Slice const& lhs, rocksdb::Slice const& rhs) const {
  std::cout << "COMPARE. LHS SIZE: " << lhs.size() << ", RHS SIZE: " << rhs.size() << "\n";
  //TRI_ASSERT(lhs.size() > 8);
  //TRI_ASSERT(rhs.size() > 8);

  // compare by index id first
  int res = memcmp(lhs.data(), rhs.data(), sizeof(TRI_idx_iid_t));

  if (res != 0) {
    std::cout << "LEFT INDEX != RIGHT INDEX (" << std::to_string(*reinterpret_cast<uint64_t const*>(lhs.data())) << ", " << std::to_string(*reinterpret_cast<uint64_t const*>(rhs.data())) << ")\n";
    return res;
  }

  std::cout << "LEFT: (" << lhs.size() << ")\n";
  for (size_t i = 0; i < lhs.size(); ++i) {
    std::cout << std::hex << (int) lhs.data()[i] << " ";
  }
  std::cout << "\n";
  
  std::cout << "RIGHT: (" << rhs.size() << ")\n";
  for (size_t i = 0; i < rhs.size(); ++i) {
    std::cout << std::hex << (int) rhs.data()[i] << " ";
  }
  std::cout << "\n";

  VPackSlice const lSlice = VPackSlice(lhs.data() + sizeof(TRI_idx_iid_t));
  VPackSlice const rSlice = VPackSlice(rhs.data() + sizeof(TRI_idx_iid_t));

  TRI_ASSERT(lSlice.isArray());
  TRI_ASSERT(rSlice.isArray());

  size_t const lLength = lSlice.length();
  size_t const rLength = rSlice.length();
  size_t const n = lLength < rLength ? lLength : rLength;

  for (size_t i = 0; i < n; ++i) {
    std::cout << "LEFT SLICE: " << lSlice.typeName() << ", " << lSlice.toJson() << "\n";
    std::cout << "RIGHT SLICE: " << rSlice.typeName() << ", " << rSlice.toJson() << "\n";
    int res = arangodb::basics::VelocyPackHelper::compare(lSlice, rSlice, true);

    if (res != 0) {
      std::cout << "COMPARE RESULT: " << res << "\n";
      return res;
    }
  }

  if (lLength != rLength) {
    std::cout << "COMPARE RESULT BECAUSE OF LENGTH: " << (lLength < rLength ? -1 : 1) << "\n";
    return lLength < rLength ? -1 : 1;
  }
  std::cout << "COMPARE RESULT: 0!!!\n";
  return 0;
}

