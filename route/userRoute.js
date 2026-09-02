import { Router } from "express";
import { addUser, getUser, getUserByUsername, loginUser, logout } from "../controller/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", addUser);
router.post("/login", loginUser);

// protected routes
router.get("/get-user/:username", authMiddleware, getUserByUsername);
router.get("/get-user", authMiddleware, getUser);
router.get("/logout", authMiddleware, logout)

export default router;