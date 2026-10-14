import { Queue } from "bullmq";
import redisConnection from "../database/redisConnection";

export const chatQueue = new Queue("chat-message-flush", { redisConnection });
