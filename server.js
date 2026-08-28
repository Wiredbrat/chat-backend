import express from 'express';
import { configDotenv } from 'dotenv';
import cors from 'cors';
import router from './router.js';
import { socketConnection } from './service/socketService.js';


configDotenv();

const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(router);

console.log(socketConnection());
app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`)
})

