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
/// @author Jan Steemann
////////////////////////////////////////////////////////////////////////////////

#include "RevisionCacheFeature.h"

#include "ApplicationFeatures/ApplicationServer.h"
#include "ProgramOptions/ProgramOptions.h"
#include "ProgramOptions/Section.h"
#include "VocBase/RevisionCacheChunkAllocator.h"

using namespace arangodb;
using namespace arangodb::application_features;
using namespace arangodb::basics;
using namespace arangodb::options;

RevisionCacheChunkAllocator* RevisionCacheFeature::ALLOCATOR = nullptr;

RevisionCacheFeature::RevisionCacheFeature(ApplicationServer* server)
    : ApplicationFeature(server, "RevisionCache"),
      _chunkSize(1 * 1024 * 1024),
      _targetSize(256 * 1024 * 1024) {
  setOptional(false);
  requiresElevatedPrivileges(false);
  startsAfter("WorkMonitor");
}

void RevisionCacheFeature::collectOptions(std::shared_ptr<ProgramOptions> options) {
  options->addSection("database", "Configure the database");
  
  options->addOption("--database.revision-cache-chunk-size", "chunk size for the document revision cache",
                     new UInt32Parameter(&_chunkSize));
  options->addOption("--database.revision-cache-target-size", "total target size for the document revision cache",
                     new UInt64Parameter(&_targetSize));
}

void RevisionCacheFeature::validateOptions(std::shared_ptr<ProgramOptions> options) {
  if (_chunkSize < 16 * 1024) {
    LOG(FATAL) << "value for '--database.revision-cache-chunk-size' is too low";
    FATAL_ERROR_EXIT();
  }
  if (_chunkSize > 128 * 1024 * 1024) {
    LOG(FATAL) << "value for '--database.revision-cache-chunk-size' is too high";
    FATAL_ERROR_EXIT();
  }

  if (_targetSize < 16 * 1024 * 1024) {
    LOG(FATAL) << "value for '--database.revision-cache-target-size' is too low";
    FATAL_ERROR_EXIT();
  }
  if (_chunkSize >= _targetSize) {
    LOG(FATAL) << "value for '--database.revision-cache-target-size' should be higher than value of '--database.revision-cache-chunk-size'";
    FATAL_ERROR_EXIT();
  }
}

void RevisionCacheFeature::prepare() {
  _allocator.reset(new RevisionCacheChunkAllocator(_chunkSize, _targetSize));
  ALLOCATOR = _allocator.get();
}

void RevisionCacheFeature::beginShutdown() {
  _gcThread->beginShutdown();
}

void RevisionCacheFeature::start() {
  _gcThread.reset(new RevisionCacheGCThread(_allocator.get()));
  if (!_gcThread->start()) {
    LOG(FATAL) << "could not start garbage collection thread";
    FATAL_ERROR_EXIT();
  }
}

void RevisionCacheFeature::stop() {
  while (_gcThread->isRunning()) {
    usleep(10000);
  }
  _gcThread.reset();
}

void RevisionCacheFeature::unprepare() {
  ALLOCATOR = nullptr;
  _allocator.reset();
}
