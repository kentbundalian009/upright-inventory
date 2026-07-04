import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Sinisiguro nitong mababasa ang .env variables
dotenv.config();

// Awtomatikong gagamitin nito ang UPSTASH_REDIS_REST_URL at UPSTASH_REDIS_REST_TOKEN mula sa .env
export const redis = Redis.fromEnv();

// Test connection log kapag umandar ang app
try {
  await redis.set("connection_test", "Upstash Redis is Working!");
  const testResult = await redis.get("connection_test");
  console.log("🔴 Redis Status:", testResult);
} catch (error) {
  console.error("🔴 Redis Connection Error:", error);
}