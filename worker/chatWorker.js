import { Worker } from "bullmq";
import redis from "../server.js";
import { saveMessagesToDB } from "../service/chatService.js";
import mongoose from "mongoose";


const chatWorker = new Worker('chat-message-flush',
  async (job) => {
    const { roomId, processingId } = job.data;

    console.log("Processing chats for roomID: ", roomId);
    console.log("Processing ID: ", processingId );

    const messageBuffer = await redis.lRange(processingId, 0, -1);
    try {
      if (messageBuffer.length === 0) {
        await redis.del(processingId);
        return;
      }

      const messageBatch = messageBuffer.map(JSON.parse);

      await saveMessagesToDB(roomId, messageBatch);
      await redis.del(processingId);
      
    } catch (error) {
      console.log("Worker Errror", error);
      throw error;
    }
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    }
  }
)

chatWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

chatWorker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}`);
});

chatWorker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed:`,
    error
  );
});
