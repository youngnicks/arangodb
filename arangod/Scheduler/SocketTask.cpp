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

#include "SocketTask.h"

#include "Basics/StringBuffer.h"
#include "Basics/socket-utils.h"
#include "Endpoint/ConnectionInfo.h"
#include "Logger/Logger.h"
#include "Scheduler/EventLoop.h"
#include "Scheduler/JobGuard.h"
#include "Scheduler/Scheduler.h"

using namespace arangodb::basics;
using namespace arangodb::rest;

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

SocketTask::SocketTask(arangodb::EventLoop loop,
                       std::unique_ptr<arangodb::Socket> socket,
                       arangodb::ConnectionInfo&& connectionInfo,
                       double keepAliveTimeout)
    : Task(loop, "SocketTask"),
      _connectionInfo(connectionInfo),
      _readBuffer(TRI_UNKNOWN_MEM_ZONE, READ_BLOCK_SIZE + 1, false),
      _peer(std::move(socket)) {
  ConnectionStatisticsAgent::acquire();
  connectionStatisticsAgentSetStart();

  _peer->_socket.non_blocking(true);

  boost::system::error_code ec;

  if (ec) {
    LOG_TOPIC(ERR, Logger::COMMUNICATION)
        << "cannot create stream from socket: " << ec;
    _closedSend = true;
    _closedReceive = true;
  }

  if (_peer->_encrypted) {
    do {
      ec.assign(boost::system::errc::success,
                boost::system::generic_category());
      _peer->_sslSocket.handshake(
          boost::asio::ssl::stream_base::handshake_type::server, ec);
    } while (ec.value() == boost::asio::error::would_block);

    if (ec) {
      LOG_TOPIC(ERR, Logger::COMMUNICATION)
          << "unable to perform ssl handshake: " << ec.message() << " : "
          << ec.value();
      _closedSend = true;
      _closedReceive = true;
    }
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void SocketTask::start() {
  if (_closedSend || _closedReceive) {
    LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "cannot start, channel closed";
    return;
  }

  if (_closeRequested) {
    LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
        << "cannot start, close alread in progress";
    return;
  }

  LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "starting communication on "
                                          << _peer->_socket.native_handle();

  auto self = shared_from_this();
  _loop._ioService->post([self, this]() { asyncReadSome(); });
}

// -----------------------------------------------------------------------------
// --SECTION--                                                 protected methods
// -----------------------------------------------------------------------------

void SocketTask::addWriteBuffer(std::unique_ptr<StringBuffer> buffer,
                                RequestStatisticsAgent* statistics) {
  TRI_request_statistics_t* stat =
      statistics == nullptr ? nullptr : statistics->steal();

  addWriteBuffer(buffer.release(), stat);
}

void SocketTask::addWriteBuffer(StringBuffer* buffer,
                                TRI_request_statistics_t* stat) {
  if (_closedSend) {
    LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
        << "dropping output, send stream already closed";

    delete buffer;

    if (stat) {
      TRI_ReleaseRequestStatistics(stat);
    }

    return;
  }

  if (_writeBuffer != nullptr) {
    _writeBuffers.push_back(buffer);
    _writeBuffersStats.push_back(stat);
    return;
  }

  _writeBuffer = buffer;
  _writeBufferStatistics = stat;

  if (_writeBuffer != nullptr) {
    boost::system::error_code ec;
    size_t total = _writeBuffer->length();
    size_t written = 0;

    try {
      if (!_peer->_encrypted) {
        written = _peer->_socket.write_some(
            boost::asio::buffer(_writeBuffer->begin(), _writeBuffer->length()));
      } else {
        written = _peer->_sslSocket.write_some(
            boost::asio::buffer(_writeBuffer->begin(), _writeBuffer->length()));
      }
      if (written == total) {
        completedWriteBuffer();
        return;
      }
    } catch (boost::system::system_error err) {
      if (err.code() != boost::asio::error::would_block) {
        LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
            << "write on stream " << _peer->_socket.native_handle()
            << " failed with " << err.what();
        closeStream();
        return;
      }
    }

    auto self = shared_from_this();
    auto handler = [this](const boost::system::error_code& ec,
                          std::size_t transferred) {
      if (ec) {
        LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
            << "write on stream " << _peer->_socket.native_handle()
            << " failed with " << ec;
        closeStream();
      } else {
        completedWriteBuffer();
      }
    };

    if (!_peer->_encrypted) {
      boost::asio::async_write(  // is ok
          _peer->_socket,
          boost::asio::buffer(_writeBuffer->begin() + written, total - written),
          handler);
    } else {
      boost::asio::async_write(
          _peer->_sslSocket,
          boost::asio::buffer(_writeBuffer->begin() + written, total - written),
          handler);
    }
  }
}

void SocketTask::completedWriteBuffer() {
  delete _writeBuffer;
  _writeBuffer = nullptr;

  if (_writeBufferStatistics != nullptr) {
    _writeBufferStatistics->_writeEnd = TRI_StatisticsTime();
    TRI_ReleaseRequestStatistics(_writeBufferStatistics);
    _writeBufferStatistics = nullptr;
  }

  if (_writeBuffers.empty()) {
    if (_closeRequested) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
          << "close requested, closing stream";

      closeStream();
    }

    return;
  }

  StringBuffer* buffer = _writeBuffers.front();
  _writeBuffers.pop_front();

  TRI_request_statistics_t* statistics = _writeBuffersStats.front();
  _writeBuffersStats.pop_front();

  addWriteBuffer(buffer, statistics);
}

void SocketTask::closeStream() {
  if (!_closedSend) {
    try {
      _peer->_socket.shutdown(boost::asio::ip::tcp::socket::shutdown_send);
    } catch (boost::system::system_error err) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "shutdown send stream "
                                              << _peer->_socket.native_handle()
                                              << " failed with " << err.what();
    }

    _closedSend = true;
  }

  if (!_closedReceive) {
    try {
      _peer->_socket.shutdown(boost::asio::ip::tcp::socket::shutdown_receive);
    } catch (boost::system::system_error err) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "shutdown send stream "
                                              << _peer->_socket.native_handle()
                                              << " failed with " << err.what();
    }

    _closedReceive = true;
  }

  try {
    _peer->_socket.close();
  } catch (boost::system::system_error err) {
    LOG_TOPIC(WARN, Logger::COMMUNICATION)
        << "close stream " << _peer->_socket.native_handle() << " failed with "
        << err.what();
  }

  _closeRequested = false;
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

bool SocketTask::reserveMemory() {
  if (_readBuffer.reserve(READ_BLOCK_SIZE + 1) == TRI_ERROR_OUT_OF_MEMORY) {
    LOG(WARN) << "out of memory while reading from client";
    closeStream();
    return false;
  }

  return true;
}

bool SocketTask::trySyncRead() {
  try {
    if (0 == _peer->_socket.available()) {
      return false;
    }

    size_t bytesRead = 0;
    if (!_peer->_encrypted) {
      bytesRead = _peer->_socket.read_some(
          boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE));
    } else {
      bytesRead = _peer->_sslSocket.read_some(
          boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE));
    }

    if (0 == bytesRead) {
      return false;  // should not happen
    }

    _readBuffer.increaseLength(bytesRead);
    return true;
  } catch (boost::system::system_error err) {
    if (err.code() == boost::asio::error::would_block) {
      return false;
    }

    throw err;
  }
}

void SocketTask::asyncReadSome() {
  auto info = _peer->_socket.native_handle();

  try {
    JobGuard guard(_loop);
    guard.enterLoop();

    size_t const MAX_DIRECT_TRIES = 2;
    size_t n = 0;

    while (++n <= MAX_DIRECT_TRIES) {
      if (!reserveMemory()) {
        LOG_TOPIC(TRACE, Logger::COMMUNICATION)
            << "failed to reserve memory for " << info;
        return;
      }

      if (!trySyncRead()) {
        if (n < MAX_DIRECT_TRIES) {
#pragma message("review fc")
#ifdef TRI_HAVE_SCHED_H
          sched_yield();
#endif
        }

        continue;
      }

      while (processRead()) {
        if (_closeRequested) {
          break;
        }
      }

      if (_closeRequested) {
        LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
            << "close requested, closing receive stream " << info;

        closeReceiveStream();
        return;
      }
    }
  } catch (boost::system::system_error err) {
    LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "i/o stream " << info
                                            << " failed with " << err.what();

    closeStream();
    return;
  } catch (...) {
    LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "general error on stream "
                                            << info;

    closeStream();
    return;
  }

  // try to read more bytes
  if (!reserveMemory()) {
    LOG_TOPIC(TRACE, Logger::COMMUNICATION) << "failed to reserve memory for "
                                            << info;
    return;
  }

  auto self = shared_from_this();
  auto handler = [self, this, info](const boost::system::error_code& ec,
                                    std::size_t transferred) {
    if (ec) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "read on stream " << info
                                              << " failed with " << ec;
      closeStream();
    } else {
      JobGuard guard(_loop);
      guard.enterLoop();

      _readBuffer.increaseLength(transferred);

      while (processRead()) {
        if (_closeRequested) {
          break;
        }
      }

      if (_closeRequested) {
        LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
            << "close requested, closing receive stream";

        closeReceiveStream();
      } else {
        asyncReadSome();
      }
    }
  };

  if (!_peer->_encrypted) {
    _peer->_socket.async_read_some(
        boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE), handler);
  } else {
    _peer->_sslSocket.async_read_some(
        boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE), handler);
  }
}

void SocketTask::closeReceiveStream() {
  auto info = _peer->_socket.native_handle();

  if (!_closedReceive) {
    try {
      _peer->_socket.shutdown(boost::asio::ip::tcp::socket::shutdown_receive);
    } catch (boost::system::system_error err) {
      LOG(WARN) << "shutdown receive stream " << info << " failed with "
                << err.what();
    }

    _closedReceive = true;
  }
}
