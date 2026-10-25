import express, { json, urlencoded } from "express";
import { configDotenv } from "dotenv";
import cors from "cors";
import router from "./route/userRoute.js";
import { socketConnection } from "./service/socketService.js";
import connectDB from "./database/dbConnection.js";
import { getRedisClient } from "./service/redisService.js";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import cookieParser from "cookie-parser";
import chatRouter from "./route/chatRoute.js";
import "./worker/chatWorker.js";
import { ws } from "./socketServer.js";
import jwt from "jsonwebtoken";
import { parseCookie } from 'cookie';
import http from "http";

configDotenv();

const PORT = process.env.PORT;
const app = express();
const server = http.createServer(app);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },

  store: new RedisStore({
    prefix: "rate-limit:",
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
});

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(limiter);

// router
app.use("/api/v1", router);
app.use("/api/v1/chat", chatRouter);

// connection upgrade
server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;

  if (!origin || origin !== process.env.FRONTEND_URL) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  try {
    const cookies = parseCookie(request.headers.cookie || "");
    const token = cookies.accessToken;

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    request.user = decoded;

    ws.handleUpgrade(request, socket, head, (websocket) => {
      websocket.userId = decoded._id;
      ws.emit("connection", websocket, request);
    });
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});

const redis = getRedisClient();
socketConnection();

(async function startServer() {
  try {
    await connectDB();
    const address = server.address();
    server.listen(PORT, () => {
      console.log(`server is running on`, address);
    });
  } catch (error) {
    console.log("ERROR WHILE SERVER START >>>", error.message);
  }
})();

export default redis;
export { app };
