import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { isProd } from "./env";

const url =
  process.env.KV_REST_API_URL ??
  process.env.STORAGE_KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ??
  process.env.STORAGE_KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "scan",
      analytics: false,
    })
  : null;

export const siteRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "300 s"),
      prefix: "site-scan",
      analytics: false,
    })
  : null;

export function rateLimitMissingInProd(): boolean {
  return redis === null && isProd();
}

export type RateLimitVerdict = "allowed" | "limited" | "unavailable";

export async function checkRateLimit(
  limiter: Ratelimit | null,
  ip: string,
): Promise<RateLimitVerdict> {
  if (!limiter) return "allowed";
  try {
    const { success } = await limiter.limit(ip);
    return success ? "allowed" : "limited";
  } catch (e) {
    console.error("Rate limit check failed — Redis is unreachable:", e);
    return isProd() ? "unavailable" : "allowed";
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (e) {
    console.error("Cache read failed:", e);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Cache write failed:", e);
  }
}
