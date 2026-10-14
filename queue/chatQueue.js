import { Queue } from "bullmq";
import redisConnection from "../database/redisConnection.js";

export const chatQueue = new Queue("chat-message-flush", {
  connection: redisConnection,
});
