/**
 * Redis connection for BullMQ (workers).
 * When REDIS_URL is not set, queue jobs will not run in workers.
 */
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL.trim()) return null;
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

export function isRedisConfigured(): boolean {
  return REDIS_URL.trim().length > 0;
}
