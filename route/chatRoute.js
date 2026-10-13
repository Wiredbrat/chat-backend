import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createGroup, createRoom, getChat } from "../controller/chatController.js";

const chatRouter = Router()

chatRouter.get('/chat/:chatId', authMiddleware, getChat);
chatRouter.post('/create-chatroom/:receiverId', authMiddleware, createRoom);
chatRouter.post('/create-chatroom', authMiddleware, createGroup);

export default chatRouter;
