import { Queue } from "bullmq";

export const chatQueue = new Queue("chat-message-flush", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});