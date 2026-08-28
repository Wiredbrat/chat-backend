import { createClient } from "redis";

const client = createClient({
  url: 'redis://localhost:6000'
});