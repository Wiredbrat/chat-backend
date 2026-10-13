import { createClient } from "redis";
import { Redis } from '@upstash/redis'
let redisClient = null;

(async function initiateRedis () {
  redisClient =
    process.env.DEVELOPEMENT ? createClient({
      url: 'redis://127.0.0.1:6379',
    }) :

    new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));

  // Establish connection
  await redisClient.connect();

})();

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client has not been initialized yet!');
  }
  return redisClient;
};
