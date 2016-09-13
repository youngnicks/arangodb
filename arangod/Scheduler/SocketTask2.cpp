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

#include "SocketTask2.h"

#include "Basics/StringBuffer.h"
#include "Basics/socket-utils.h"
#include "Logger/Logger.h"
#include "Scheduler/JobGuard.h"
#include "Scheduler/Scheduler.h"

using namespace arangodb::basics;
using namespace arangodb::rest;

// -----------------------------------------------------------------------------
// --SECTION--                                      constructors and destructors
// -----------------------------------------------------------------------------

// loop contains an asioio::service
// stream is an asio socket and instead of opening
// and operating system socket we assign the socket
// given to us as TRI_socket_t to the asio::socket
SocketTask2::SocketTask2(EventLoop2 loop, TRI_socket_t socket,
                         ConnectionInfo&& connectionInfo,
                         double keepAliveTimeout)
    : Task2(loop, "SocketTask2"),
      _connectionInfo(connectionInfo),
      _readBuffer(TRI_UNKNOWN_MEM_ZONE, READ_BLOCK_SIZE + 1, false),
      _encypted(false),
#ifdef ARANGODB_SSL_ENABLED
      _context(asioSslContext::sslv23),
      _sslSocket(loop._ioService, _context)
#else
      _socket(loop._ioService)
#endif
{

#ifndef ARANGODB_SSL_ENABLED
  if (_encypted) {
    throw std::logic_error(
        "server compiled without ssl no encyption available");
  }
#endif

  ConnectionStatisticsAgent::acquire();
  connectionStatisticsAgentSetStart();

  boost::system::error_code ec;
  getBaseSocket().assign(boost::asio::ip::tcp::v4(), socket.fileDescriptor, ec);
  getBaseSocket().non_blocking(true);  // does this work as intened ()

  if (ec) {
    LOG_TOPIC(ERR, Logger::COMMUNICATION)
        << "cannot create stream from socket: " << ec;
    _closedSend = true;
    _closedReceive = true;
  }
}

// -----------------------------------------------------------------------------
// --SECTION--                                                    public methods
// -----------------------------------------------------------------------------

void SocketTask2::start() {
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
                                          << getBaseSocket().native_handle();

  _loop._ioService.post([this]() { asyncReadSome(); });
}

// -----------------------------------------------------------------------------
// --SECTION--                                                 protected methods
// -----------------------------------------------------------------------------

void SocketTask2::addWriteBuffer(std::unique_ptr<basics::StringBuffer> buffer,
                                 RequestStatisticsAgent* statistics) {
  TRI_request_statistics_t* stat =
      statistics == nullptr ? nullptr : statistics->steal();

  addWriteBuffer(buffer.release(), stat);
}

void SocketTask2::addWriteBuffer(basics::StringBuffer* buffer,
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
      // written = _stream.write_some(

      if (!_encypted) {
        written = getSocket().write_some(
            boost::asio::buffer(_writeBuffer->begin(), _writeBuffer->length()));
      }
#ifdef ARANGODB_SSL_ENABLED
      else {
        written = _sslSocket.write_some(
            boost::asio::buffer(_writeBuffer->begin(), _writeBuffer->length()));
      }
#endif
      if (written == total) {
        completedWriteBuffer();
        return;
      }
    } catch (boost::system::system_error err) {
      if (err.code() != boost::asio::error::would_block) {
        LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
            << "write on stream " << getBaseSocket().native_handle()
            << " failed with " << err.what();
        closeStream();
        return;
      }
    }

    if (!_encypted) {
      boost::asio::async_write(  // is ok
          getSocket(),
          boost::asio::buffer(_writeBuffer->begin() + written, total - written),
          [this](const boost::system::error_code& ec, std::size_t transferred) {
            if (ec) {
              LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
                  << "write on stream " << getBaseSocket().native_handle()
                  << " failed with " << ec;
              closeStream();
            } else {
              completedWriteBuffer();
            }
          });
    }
#ifdef ARANGODB_SSL_ENABLED
    else {
      boost::asio::async_write(
          _sslSocket,
          boost::asio::buffer(_writeBuffer->begin() + written, total - written),
          [this](const boost::system::error_code& ec, std::size_t transferred) {
            if (ec) {
              LOG_TOPIC(DEBUG, Logger::COMMUNICATION)
                  << "write on stream " << getBaseSocket().native_handle()
                  << " failed with " << ec;
              closeStream();
            } else {
              completedWriteBuffer();
            }
          });
    }
#endif
  }
}

void SocketTask2::completedWriteBuffer() {
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

void SocketTask2::closeStream() {
  if (!_closedSend) {
    try {
      getBaseSocket().shutdown(boost::asio::ip::tcp::socket::shutdown_send);
    } catch (boost::system::system_error err) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "shutdown send stream "
                                              << getBaseSocket().native_handle()
                                              << " failed with " << err.what();
    }

    _closedSend = true;
  }

  if (!_closedReceive) {
    try {
      getBaseSocket().shutdown(boost::asio::ip::tcp::socket::shutdown_receive);
    } catch (boost::system::system_error err) {
      LOG_TOPIC(DEBUG, Logger::COMMUNICATION) << "shutdown send stream "
                                              << getBaseSocket().native_handle()
                                              << " failed with " << err.what();
    }

    _closedReceive = true;
  }

  try {
    getBaseSocket().close();
  } catch (boost::system::system_error err) {
    LOG_TOPIC(WARN, Logger::COMMUNICATION)
        << "close stream " << getBaseSocket().native_handle() << " failed with "
        << err.what();
  }

  _closeRequested = false;
}

// -----------------------------------------------------------------------------
// --SECTION--                                                   private methods
// -----------------------------------------------------------------------------

bool SocketTask2::reserveMemory() {
  if (_readBuffer.reserve(READ_BLOCK_SIZE + 1) == TRI_ERROR_OUT_OF_MEMORY) {
    LOG(WARN) << "out of memory while reading from client";
    closeStream();
    return false;
  }

  return true;
}

bool SocketTask2::trySyncRead() {
  try {
    if (0 == getBaseSocket().available()) {
      return false;
    }

    size_t bytesRead = 0;
    if (!_encypted) {
      bytesRead = getSocket().read_some(
          boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE));
    }
#ifdef ARANGODB_SSL_ENABLED
    else {
      bytesRead = _sslSocket.read_some(
          boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE));
    }
#endif

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

void SocketTask2::asyncReadSome() {
  auto info = getBaseSocket().native_handle();

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
          sched_yield();
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

  if (!_encypted) {
    getSocket().async_read_some(
        boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE),
        [this, info](const boost::system::error_code& ec,
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
        });
  }
#ifdef ARANGODB_SSL_ENABLED
  else {
    _sslSocket.async_read_some(
        boost::asio::buffer(_readBuffer.end(), READ_BLOCK_SIZE),
        [this, info](const boost::system::error_code& ec,
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
        });
  }
#endif
}

void SocketTask2::closeReceiveStream() {
  auto info = getBaseSocket().native_handle();

  if (!_closedReceive) {
    try {
      getBaseSocket().shutdown(boost::asio::ip::tcp::socket::shutdown_receive);
    } catch (boost::system::system_error err) {
      LOG(WARN) << "shutdown receive stream " << info << " failed with "
                << err.what();
    }

    _closedReceive = true;
  }
}
