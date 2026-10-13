import { Redis } from '@upstash/redis'
let redisClient = null;

(async function initiateRedis () {
  redisClient = new Redis({
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
