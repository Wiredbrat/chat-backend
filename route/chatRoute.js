import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createRoom, getChat } from "../controller/chatController.js";

const chatRouter = Router()

chatRouter.get('/chat/:chatId', getChat);
chatRouter.post('/create-chatroom/:receiverId', authMiddleware, createRoom);

export default chatRouter;