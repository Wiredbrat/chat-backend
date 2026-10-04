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

configDotenv();

const PORT = process.env.PORT;
const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      // Allows requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      // Dynamically approves the incoming website origin
      callback(null, origin);
    },
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

const redis = getRedisClient();
socketConnection();
(async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log("ERROR WHILE SERVER START >>>", error.message);
  }
})();

export default redis;
