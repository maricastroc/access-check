import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { logError } from "./observability/log";

export type RateLimitVerdict = "allowed" | "limited";

type Rule = { tokens: number; windowSeconds: number };

const MAX_TRACKED_KEYS = 10_000;

class MemoryLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly rule: Rule) {}

  limit(key: string): RateLimitVerdict {
    const now = Date.now();
    const cutoff = now - this.rule.windowSeconds * 1000;
    this.sweep(cutoff);

    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= this.rule.tokens) {
      this.hits.set(key, recent);
      return "limited";
    }

    recent.push(now);
    this.hits.set(key, recent);
    return "allowed";
  }

  private sweep(cutoff: number): void {
    if (this.hits.size < MAX_TRACKED_KEYS) return;
    for (const [key, times] of this.hits) {
      if ((times[times.length - 1] ?? 0) <= cutoff) this.hits.delete(key);
    }
    if (this.hits.size >= MAX_TRACKED_KEYS) this.hits.clear();
  }
}

export class RateLimiter {
  private readonly memory: MemoryLimiter;
  private readonly shared: Ratelimit | null;

  constructor(
    private readonly rule: Rule,
    private readonly prefix: string,
  ) {
    this.memory = new MemoryLimiter(rule);
    this.shared = redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(rule.tokens, `${rule.windowSeconds} s`),
          prefix,
          analytics: false,
        })
      : null;
  }

  async check(key: string): Promise<RateLimitVerdict> {
    if (this.shared) {
      try {
        const { success } = await this.shared.limit(key);
        return success ? "allowed" : "limited";
      } catch (e) {
        logError("ratelimit.degraded", e, { limiter: this.prefix, fallback: "in-memory" });
      }
    }
    return this.memory.limit(key);
  }
}

export const scanRateLimit = new RateLimiter({ tokens: 5, windowSeconds: 60 }, "scan");
export const siteScanRateLimit = new RateLimiter({ tokens: 2, windowSeconds: 300 }, "site-scan");

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
