/*jslint indent: 2, nomen: true, maxlen: 120, todo: true, white: false, sloppy: false */
/*global require, describe, beforeEach, it, expect, spyOn, afterEach*/
/*global ArangoClusterInfo */

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
    msgCollection, shardName;

  beforeEach(function () {
    executionNumber = "UnitTest123";
    vertexCollectionName = "UnitTestVertices";
    msgCollectionName = pregel.genMsgCollectionName(executionNumber);
    step = 2;
    senderId = vertexCollectionName + "/sender";
    receiverId = vertexCollectionName + "/receiver";
    shardName = "UnitTestShard";
    try {
      db._drop(vertexCollectionName);
    } catch (ignore) { }
    try {
      db._drop(msgCollectionName);
    } catch (ignore) { }
    db._create(vertexCollectionName);
    db._createEdgeCollection(msgCollectionName).ensureHashIndex("toShard");
    msgCollection = pregel.getMsgCollection(executionNumber);
    testee = new Queue(executionNumber, senderId, step);
    if (!ArangoClusterInfo.getResponsibleShard) {
      ArangoClusterInfo.getResponsibleShard = function () {
        return undefined;
      };
    }
    spyOn(ArangoClusterInfo, "getResponsibleShard").and.returnValue(shardName);
  });

  afterEach(function () {
    db._drop(vertexCollectionName);
    db._drop(msgCollectionName);
  });

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
      expect(ArangoClusterInfo.getResponsibleShard).not.toHaveBeenCalledWith(senderId);
      expect(ArangoClusterInfo.getResponsibleShard).toHaveBeenCalledWith(receiverId);
    });

  });

  describe("incomming", function () {

    it("should create a cursor for messages", function () {
      var firstText = "aaa";
      var secondText = "bbb";
      var thirdText = "ccc";

      msgCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      msgCollection.save(receiverId, senderId, {data: secondText, step: step, toShard: shardName});
      msgCollection.save(receiverId, senderId, {data: thirdText, step: step, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(3);
      expect(incomming.toArray().sort()).toEqual([firstText, secondText, thirdText].sort());
    });

    it("should not contain messages for other steps", function () {
      var firstText = "aaa";
      var otherStep = "Other step";

      msgCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      msgCollection.save(receiverId, senderId, {data: otherStep, step: step - 1, toShard: shardName});
      msgCollection.save(receiverId, senderId, {data: otherStep, step: step + 1, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(1);
      expect(incomming.toArray()).toEqual([firstText]);
    });

    it("should not contain messages for other vertices", function () {
      var firstText = "aaa";
      var otherText = "Not for your eyes";

      msgCollection.save(receiverId, senderId, {data: firstText, step: step, toShard: shardName});
      msgCollection.save(senderId, receiverId, {data: otherText, step: step, toShard: shardName});
      var incomming = testee.getMessages();
      expect(incomming.count()).toEqual(1);
      expect(incomming.toArray()).toEqual([firstText]);
    });

  });

});
