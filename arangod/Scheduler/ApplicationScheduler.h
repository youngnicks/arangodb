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

#ifndef ARANGOD_SCHEDULER_APPLICATION_SCHEDULER_H
#define ARANGOD_SCHEDULER_APPLICATION_SCHEDULER_H 1

#include "Basics/Common.h"

#include "ApplicationServer/ApplicationFeature.h"

namespace arangodb {
namespace rest {
class ApplicationServer;
class Scheduler;
class SignalTask;
class Task;

////////////////////////////////////////////////////////////////////////////////
/// @brief application server scheduler implementation
////////////////////////////////////////////////////////////////////////////////

class ApplicationScheduler : public ApplicationFeature {
 private:
  ApplicationScheduler(ApplicationScheduler const&);
  ApplicationScheduler& operator=(ApplicationScheduler const&);

 public:
  explicit ApplicationScheduler(ApplicationServer*);

  ~ApplicationScheduler();

 public:
  //////////////////////////////////////////////////////////////////////////////
  /// @brief allows a multi scheduler to be build
  //////////////////////////////////////////////////////////////////////////////

  void allowMultiScheduler(bool value = true);

  //////////////////////////////////////////////////////////////////////////////
  /// @brief returns the scheduler
  //////////////////////////////////////////////////////////////////////////////

  Scheduler* scheduler() const;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief returns the number of used threads
  //////////////////////////////////////////////////////////////////////////////

  size_t numberOfThreads();

  //////////////////////////////////////////////////////////////////////////////
  /// @brief sets the processor affinity
  //////////////////////////////////////////////////////////////////////////////

  void setProcessorAffinity(std::vector<size_t> const& cores);

  //////////////////////////////////////////////////////////////////////////////
  /// @brief disables CTRL-C handling (because taken over by console input)
  //////////////////////////////////////////////////////////////////////////////

  void disableControlCHandler();

 public:
  void setupOptions(std::map<std::string, basics::ProgramOptionsDescription>&);

  bool afterOptionParsing(basics::ProgramOptions&);

  bool prepare();

  bool start();

  bool open();

  void stop();

 private:
  //////////////////////////////////////////////////////////////////////////////
  /// @brief builds the scheduler
  //////////////////////////////////////////////////////////////////////////////

  void buildScheduler();

  //////////////////////////////////////////////////////////////////////////////
  /// @brief builds the scheduler reporter
  //////////////////////////////////////////////////////////////////////////////

  void buildSchedulerReporter();

  //////////////////////////////////////////////////////////////////////////////
  /// @brief quits on control-c signal
  //////////////////////////////////////////////////////////////////////////////

  void buildControlCHandler();

  //////////////////////////////////////////////////////////////////////////////
  /// @brief adjusts the file descriptor limits
  //////////////////////////////////////////////////////////////////////////////

  void adjustFileDescriptors();

 private:
  //////////////////////////////////////////////////////////////////////////////
  /// @brief application server
  //////////////////////////////////////////////////////////////////////////////

  ApplicationServer* _applicationServer;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief scheduler
  //////////////////////////////////////////////////////////////////////////////

  Scheduler* _scheduler;  // TODO(fc) XXX delete this, this is now a singleton

  //////////////////////////////////////////////////////////////////////////////
  /// @brief task list
  //////////////////////////////////////////////////////////////////////////////

  std::vector<Task*> _tasks;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief interval for reports
  //////////////////////////////////////////////////////////////////////////////

  double _reportInterval;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief is a multi-threaded scheduler allowed
  //////////////////////////////////////////////////////////////////////////////

  bool _multiSchedulerAllowed;

  ////////////////////////////////////////////////////////////////////////////////
  /// @brief was docuBlock schedulerThreads
  ////////////////////////////////////////////////////////////////////////////////

  uint32_t _nrSchedulerThreads;

  ////////////////////////////////////////////////////////////////////////////////
  /// @brief was docuBlock schedulerBackend
  ////////////////////////////////////////////////////////////////////////////////

  uint32_t _backend;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief minimum number of file descriptors
  //////////////////////////////////////////////////////////////////////////////

  uint32_t _descriptorMinimum;

  //////////////////////////////////////////////////////////////////////////////
  /// @brief disables CTRL-C handling (because taken over by console input)
  //////////////////////////////////////////////////////////////////////////////

  bool _disableControlCHandler;
};
}
}

#endif