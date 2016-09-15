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
/// @author Achim Brandt
////////////////////////////////////////////////////////////////////////////////

#ifndef ARANGOD_SCHEDULER_SOCKET_TASK2_H
#define ARANGOD_SCHEDULER_SOCKET_TASK2_H 1

#include "Scheduler/Task2.h"

#include "Basics/Thread.h"
#include "Statistics/StatisticsAgent.h"

#ifdef _WIN32
#include "Basics/win-utils.h"
#endif

#include "Basics/socket-utils.h"

#include <boost/asio/ssl.hpp>


namespace arangodb {
namespace basics {
class StringBuffer;
}

namespace rest {
namespace asio = ::boost::asio;
using asioSocket = asio::ip::tcp::socket;
using asioSslStream = asio::ssl::stream<asioSocket>;
using asioSslContext = asio::ssl::context;

class SocketTask2 : virtual public Task2, public ConnectionStatisticsAgent {
  explicit SocketTask2(SocketTask2 const&) = delete;
  SocketTask2& operator=(SocketTask2 const&) = delete;

 private:
  static size_t const READ_BLOCK_SIZE = 10000;

 public:
  SocketTask2(EventLoop2, TRI_socket_t, ConnectionInfo&&, double keepAliveTimeout);
  ~SocketTask2() {}

 public:
  void start();

 protected:
  virtual bool processRead() = 0;

 protected:
  void addWriteBuffer(std::unique_ptr<basics::StringBuffer> buffer) {
    addWriteBuffer(std::move(buffer), (RequestStatisticsAgent*)nullptr);
  }

  void addWriteBuffer(std::unique_ptr<basics::StringBuffer>,
                      RequestStatisticsAgent*);

  void addWriteBuffer(basics::StringBuffer*, TRI_request_statistics_t*);

  void completedWriteBuffer();

  void closeStream();

 protected:
  ConnectionInfo _connectionInfo;

  basics::StringBuffer _readBuffer;

  basics::StringBuffer* _writeBuffer = nullptr;
  TRI_request_statistics_t* _writeBufferStatistics = nullptr;

  std::deque<basics::StringBuffer*> _writeBuffers;
  std::deque<TRI_request_statistics_t*> _writeBuffersStats;
  bool _encypted;

  asioSslContext _context;
  asioSslStream _sslSocket;
  asioSocket&  _socket;

 protected:
  bool _closeRequested = false;

 private:
  bool reserveMemory();
  bool trySyncRead();
  void asyncReadSome();
  void closeReceiveStream();

 private:
  bool _closedSend = false;
  bool _closedReceive = false;

};
}
}

#endif
