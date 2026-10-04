import { Router } from "express";
import { addUser, getUser, getUserByUsername, loginUser, logout, getChatRooms, getUserChats } from "../controller/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", addUser);
router.post("/login", loginUser);

// protected routes
router.get("/user/:username", authMiddleware, getUserByUsername);
router.get("/user", authMiddleware, getUser);
router.get("/logout", authMiddleware, logout)
router.get("/chatrooms", authMiddleware, getChatRooms)
router.get("/messages/:chatRoomId", authMiddleware, getUserChats)

export default router;