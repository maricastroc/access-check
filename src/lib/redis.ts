import { Redis } from "@upstash/redis";
import { logWarn } from "./observability/log";

const url =
  process.env.KV_REST_API_URL ??
  process.env.STORAGE_KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ??
  process.env.STORAGE_KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (e) {
    logWarn("cache.read.failed", e, { key });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    logWarn("cache.write.failed", e, { key, ttlSeconds });
  }
}
