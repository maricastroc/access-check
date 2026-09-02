import { Redis } from "@upstash/redis";

const url =
  process.env.KV_REST_API_URL ??
  process.env.STORAGE_KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ??
  process.env.STORAGE_KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Optional throughout. Nothing here is required for the app to serve a scan —
 * without it, results just aren't cached and rate limits fall back to the
 * per-instance window in `rate-limit.ts`.
 */
export const redis = url && token ? new Redis({ url, token }) : null;

/** Cache reads are best-effort: an outage is a miss, never a failed request. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (e) {
    console.error("Cache read failed:", e);
    return null;
  }
}

/** Cache writes are best-effort: an outage must not fail a completed scan. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Cache write failed:", e);
  }
}
