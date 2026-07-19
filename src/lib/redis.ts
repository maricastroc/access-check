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

/**
 * True when rate limiting is unconfigured in an environment that requires it.
 * Public routes should reject with 503 rather than serve unlimited requests —
 * fail closed in production, stay permissive in local development.
 */
export function rateLimitMissingInProd(): boolean {
  return redis === null && isProd();
}
