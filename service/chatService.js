import crypto from 'crypto';
import redis from '../server.js';
import { chatQueue } from '../queue/chatQueue.js';
import Chat from '../model/chatModel.js';


export async function claimChatBatch(chatRoomId) {
  console.log("ClaimChatBatch run>>>>>>>>>>>>>>>>>>>>>>");
  const activeKey = `chat:buffer:${chatRoomId}`;
  const batchId = crypto.randomUUID();
  const processingKey = `chat:processing:${chatRoomId}:${batchId}`;

  try {
    await redis.rename(activeKey, processingKey);
    console.log("ClaimChatBatch Processed>>>>>>>>>>>>>>>>>>>>>>");

    return processingKey;
  } catch (error) {
    return null;
  }
}

export async function lastMessageOfRoom(roomId, message) {
  try {
    const key = `chat:lastMessage:${roomId}`;
    await redis.set(key, JSON.stringify(message));
  } catch (error) {
    console.error("Error: ", error.message)
  }
}

export async function bufferMessage(roomId, message) {
  // console.log("bufferMessage run>>>>>>>>>>>>>>>>>>>>>>");

  const key = `chat:buffer:${roomId}`;
  await redis.rPush(key, JSON.stringify(message));
  const count = await redis.lLen(key);

  if (count >= 20) {
    const processingId = await claimChatBatch(roomId);
    if (processingId) {
      console.log("bufferMessage sent to QUEUE>>>>>>>>>>>>>>>>>>>>>>");
      try {
        await chatQueue.add(
          "flush-chat",
          { roomId, processingId },
          {
            attempts: 5,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          }
        );

      } catch (error) {
        console.error("Queue Error: ", error.message)
      }

    }
  }
}

export async function saveMessagesToDB(roomId, messageBatch) {
  console.log("saveMessagesToDB run>>>>>>>>>>>>>>>>>>>>>>");

  try {
    await Chat.create({
      chatRoomId: roomId,
      messages: messageBatch
    });
    console.log("saveMessagesToDB create end >>>>>>>>>>>>>>>>>>>>>>");

  } catch (error) {
    console.log("Error while saving chats", error.message);
  }
}
