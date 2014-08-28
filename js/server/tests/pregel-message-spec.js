/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, afterEach*/
/*global ArangoClusterInfo, ArangoServerState */

////////////////////////////////////////////////////////////////////////////////
/// @brief test pregels message object offered to the user
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2010-2014 triagens GmbH, Cologne, Germany
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
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Florian Bartels, Michael Hackstein
/// @author Copyright 2014, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var db = require("internal").db;
var pregel = require("org/arangodb/pregel");
var Queue = pregel.MessageQueue;

describe("Pregel MessageQueue", function () {
  "use strict";

  var testee, executionNumber, senderId, receiverId, step, msgCollectionName, vertexCollectionName,
    workCollectionName, globalCollectionName, msgCollection, workCollection, shardName, globalCollection, map;

  var sumAggregate = function (newVal, oldVal) {
    return newVal + oldVal;
  };


  beforeEach(function () {
    executionNumber = "UnitTest123";
    msgCollectionName = pregel.genMsgCollectionName(executionNumber);
    workCollectionName = pregel.genWorkCollectionName(executionNumber);
    db._drop(msgCollectionName);
    db._drop(workCollectionName);
    db._create(msgCollectionName).ensureHashIndex("toShard");
    db._create(workCollectionName);
    msgCollection = pregel.getMsgCollection(executionNumber);
    workCollection = pregel.getWorkCollection(executionNumber);
  });

  afterEach(function () {
    db._drop(msgCollectionName);
    db._drop(workCollectionName);
  });

  describe("during task execution", function () {

    var queue, target1, target2, target3, shard1, shard2;

    beforeEach(function () {
      shard1 = "shard1";
      shard2 = "shard2";
      target1 = {
        _id: "target/1",
        shard: shard1
      };
      target2 = {
        _id: "target/2",
        shard: shard1
      };
      target3 = {
        _id: "target/3",
        shard: shard2
      };
    });

    describe("low level message send",  function () {

      describe("without aggregate", function () {

        beforeEach(function () {
          queue = new Queue(executionNumber, []);
        });

        it("should store the message in output", function () {
          var msg = {
            data: 2
          };
          queue._send(target1, msg);
          queue._send(target2, msg);
          queue._send(target3, msg);

          expect(queue.__output[shard1]).toBeDefined();
          expect(queue.__output[shard2]).toBeDefined();
          expect(queue.__output[shard1][target1._id]).toBeDefined();
          expect(queue.__output[shard1][target2._id]).toBeDefined();
          expect(queue.__output[shard2][target3._id]).toBeDefined();

          expect(queue.__output[shard1][target1._id].aggregate).toBeUndefined();
          expect(queue.__output[shard1][target2._id].aggregate).toBeUndefined();
          expect(queue.__output[shard2][target3._id].aggregate).toBeUndefined();

          expect(queue.__output[shard1][target1._id].plain).toEqual([msg]);
          expect(queue.__output[shard1][target2._id].plain).toEqual([msg]);
          expect(queue.__output[shard2][target3._id].plain).toEqual([msg]);
        });

        it("should create an array of messages if no aggregate is given", function () {
          var msg1 = {
            data: 2
          };
          var msg2 = {
            data: 4,
            sender: 123
          };
          var msg3 = {
            data: 8,
            sender: "peter"
          };
          queue._send(target1, msg1);
          queue._send(target1, msg2);
          queue._send(target1, msg3);
          expect(queue.__output[shard1][target1._id].plain).toEqual([msg1, msg2, msg3]);
        });

      });

      describe("with aggregate", function () {

        beforeEach(function () {
          queue = new Queue(executionNumber, [], sumAggregate);
        });

        it("should aggregate messages to the same vertex", function () {
          var msg1 = {
            data: 2
          };
          var msg2 = {
            data: 4
          };
          var msg3 = {
            data: 8
          };
          queue._send(target1, msg1);
          queue._send(target1, msg2);
          queue._send(target1, msg3);
          expect(queue.__output[shard1][target1._id].aggregate).toEqual(14);
          expect(queue.__output[shard1][target1._id].plain).toBeUndefined();
        });

        it("should not aggregate messages with a sender", function () {
          var msg1 = {
            data: 2
          };
          var msg2 = {
            data: 4,
            sender: "self"
          };
          var msg3 = {
            data: 8
          };
          queue._send(target1, msg1);
          queue._send(target1, msg2);
          queue._send(target1, msg3);
          expect(queue.__output[shard1][target1._id].aggregate).toEqual(10);
          expect(queue.__output[shard1][target1._id].plain).toEqual([msg2]);
        });

      });

    });

    describe("vertex message queues", function () {

      it("should create a queue for each vertex on setup", function () {
        var v1 = "v/1";
        var v2 = "v/2";
        var vertices = [];
        vertices.push({
          _locationInfo: {
            _id: v1,
            shard: "s100"
          }
        });
        vertices.push({
          _locationInfo: {
            _id: v2,
            shard: "s101"
          }
        });
        queue = new Queue(executionNumber, vertices);
        expect(queue.__queues.sort()).toEqual([v1, v2].sort());
        expect(queue[v1]).toBeDefined();
        expect(queue[v2]).toBeDefined();
      });

      describe("messages in the queue", function () {

        var vertices, v1, v2, v3, firstMsg, secondMsg, thirdMsg;

        beforeEach(function () {
          vertices = [];
          v1 = "v/1";
          v2 = "v/2";
          v3 = "v/3";
          vertices.push({
            _locationInfo: {
              _id: v1,
              shard: "s100"
            }
          });
          vertices.push({
            _locationInfo: {
              _id: v2,
              shard: "s101"
            }
          });
          vertices.push({
            _locationInfo: {
              _id: v3,
              shard: "s100"
            }
          });
          queue = new Queue(executionNumber, vertices);
          var msgContent = {
            toShard: "s100",
            step: 0
          };
          firstMsg = {
            data: "first",
            sender: {_id: "v/3", shard: "s101"}
          };
          secondMsg = {
            data: "second",
            sender: {_id: "v/3", shard: "s101"}
          };
          thirdMsg = {
            data: 15,
            sender: {_id: "v/3", shard: "s101"}
          };
          msgContent[v1] = {
            aggregate: 15
          };
          msgContent[v2] = {
            plain: [firstMsg, secondMsg]
          };
          msgContent[v3] = {
            aggregate: 1,
            plain: [thirdMsg]
          };
          workCollection.save(msgContent);
          workCollection.save(msgContent);
          queue._fillQueues();
        });

        it("should contain all aggregates of a vertex", function () {
          var vQueue = queue[v1];
          expect(vQueue.count()).toEqual(2);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual({data: 15});
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual({data: 15});
          expect(vQueue.hasNext()).toEqual(false);
          expect(vQueue.next()).toEqual(null);
        });

        it("should concatenate plain messages in the query cursor", function () {
          var vQueue = queue[v2];
          expect(vQueue.count()).toEqual(4);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(firstMsg);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(secondMsg);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(firstMsg);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(secondMsg);
          expect(vQueue.hasNext()).toEqual(false);
          expect(vQueue.next()).toEqual(null);
        });

        it("should put the aggregate as the first entry of each msg list", function () {
          var vQueue = queue[v3];
          expect(vQueue.count()).toEqual(4);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual({data: 1});
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(thirdMsg);
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual({data: 1});
          expect(vQueue.hasNext()).toEqual(true);
          expect(vQueue.next()).toEqual(thirdMsg);
          expect(vQueue.hasNext()).toEqual(false);
          expect(vQueue.next()).toEqual(null);
        });

      });
    });

    it("should fill the message collection", function () {
      queue = new Queue(executionNumber, [], sumAggregate);
      queue._fillQueues();
      var msg1 = {
        data: 2
      };
      var msg2 = {
        data: 4
      };
      var msg3 = {
        data: 8
      };
      queue._send(target1, msg1);
      queue._send(target1, msg2);
      queue._send(target2, msg2);
      queue._send(target2, msg3);
      queue._send(target3, msg1);
      queue._send(target3, msg3);

      expect(msgCollection.count()).toEqual(0);

      queue._storeInCollection();

      expect(msgCollection.count()).toEqual(2);
      var list = msgCollection.toArray();

      var toS1, toS2;
      if (list[0].toShard === "shard1") {
        toS1 = list[0];
        toS2 = list[1];
      } else {
        toS1 = list[1];
        toS2 = list[0];
      }
      expect(toS1.step).toEqual(1);
      expect(toS1[target1._id].aggregate).toEqual(6);
      expect(toS1[target2._id].aggregate).toEqual(12);
      expect(toS1[target3._id]).toBeUndefined();

      expect(toS2.step).toEqual(1);
      expect(toS2[target1._id]).toBeUndefined();
      expect(toS2[target2._id]).toBeUndefined();
      expect(toS2[target3._id].aggregate).toEqual(10);
    });

  });

  /*
  describe("outgoing", function () {

    it("should send text messages", function () {
      var text = "This is a message";
      expect(msgCollection.count()).toEqual(0);
      testee.sendTo(receiverId, text);
      expect(msgCollection.count()).toEqual(1);
      var sended = msgCollection.any();
      expect(sended._from).toEqual(senderId);
      expect(sended._to).toEqual(receiverId);
      expect(sended.data).toEqual(text);
      expect(sended.step).toEqual(step + 1);
    });

    it("should send json messages", function () {
      var object = {
        a: "my a",
        b: "your b",
        value: 123
      };
      expect(msgCollection.count()).toEqual(0);
      testee.sendTo(receiverId, object);
      expect(msgCollection.count()).toEqual(1);
      var sended = msgCollection.any();
      expect(sended._from).toEqual(senderId);
      expect(sended._to).toEqual(receiverId);
      expect(sended.data).toEqual(object);
      expect(sended.step).toEqual(step + 1);
    });

    it("should store the responsible shard", function () {
      var text = "This is a message";
      testee.sendTo(receiverId, text);
      var sended = msgCollection.any();
      expect(sended.toShard).toEqual(shardName);
      expect(pregel.getResponsibleShard).not.toHaveBeenCalledWith(
        executionNumber,
        senderId.split("/")[0],
        {_id: senderId}
      );
      expect(pregel.getResponsibleShard).toHaveBeenCalledWith(
        executionNumber,
        receiverId.split("/")[0],
        {_id: receiverId}
      );
    });

  });

  describe("incomming", function () {

    it("should create a cursor for messages", function () {
      var firstText = "aaa";
      var secondText = "bbb";
      var thirdText = "ccc";

      workCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      workCollection.save(receiverId, senderId, {data: secondText, step: step, toShard: shardName});
      workCollection.save(receiverId, senderId, {data: thirdText, step: step, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(3);
      expect(incomming.toArray().map(function (d) {
        return d.data;
      }).sort()).toEqual([firstText, secondText, thirdText].sort());
    });

    it("should not contain messages for other steps", function () {
      var firstText = "aaa";
      var otherStep = "Other step";

      workCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      workCollection.save(receiverId, senderId, {data: otherStep, step: step - 1, toShard: shardName});
      workCollection.save(receiverId, senderId, {data: otherStep, step: step + 1, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(1);
      expect(incomming.toArray().map(function (d) {
        return d.data;
      })).toEqual([firstText]);
    });

    it("should not contain messages for other vertices", function () {
      var firstText = "aaa";
      var otherText = "Not for your eyes";

      workCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      workCollection.save(senderId, receiverId, {data: otherText, step: step, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(1);
      expect(incomming.toArray().map(function (d) {
        return d.data;
      })).toEqual([firstText]);
    });

  });
  */

});
