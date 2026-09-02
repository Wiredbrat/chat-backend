import express, {json, urlencoded } from 'express';
import { configDotenv } from 'dotenv';
import cors from 'cors';
import router from './route/userRoute.js';
import { socketConnection } from './service/socketService.js';
import connectDB from './database/dbConnection.js';
import { getRedisClient } from './service/redisService.js';
import cookieParser from 'cookie-parser';


configDotenv();

const PORT = process.env.PORT;
const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allows requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    // Dynamically approves the incoming website origin
    callback(null, origin);
  },
  credentials: true
}));

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/v1" ,router);

const redis = getRedisClient();
socketConnection();
(async function startServer () {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`server is running on http://localhost:${PORT}`)
    })    
  } catch (error) {
    console.log("ERROR WHILE SERVER START >>>", error.message)
  }
})();  


export default redis;