import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sharedLimit = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = (tokens: number, window: string) => ({ tokens, window });
    limit = sharedLimit;
  },
}));

async function importWithRedis() {
  vi.resetModules();
  vi.stubEnv("KV_REST_API_URL", "https://stub.upstash.io");
  vi.stubEnv("KV_REST_API_TOKEN", "stub-token");
  return import("./rate-limit");
}

async function importWithoutRedis() {
  vi.resetModules();
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  return import("./rate-limit");
}

beforeEach(() => {
  sharedLimit.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("in-memory window (no Redis configured)", () => {
  it("allows up to the token count, then limits", async () => {
    const { RateLimiter } = await importWithoutRedis();
    const limiter = new RateLimiter({ tokens: 3, windowSeconds: 60 }, "test");

    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("limited");
  });

  it("counts each caller separately", async () => {
    const { RateLimiter } = await importWithoutRedis();
    const limiter = new RateLimiter({ tokens: 1, windowSeconds: 60 }, "test");

    expect(await limiter.check("1.1.1.1")).toBe("allowed");
    expect(await limiter.check("1.1.1.1")).toBe("limited");
    expect(await limiter.check("2.2.2.2")).toBe("allowed");
  });

  it("lets the caller through again once the window rolls past", async () => {
    vi.useFakeTimers();
    const { RateLimiter } = await importWithoutRedis();
    const limiter = new RateLimiter({ tokens: 1, windowSeconds: 60 }, "test");

    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("limited");

    vi.advanceTimersByTime(61_000);
    expect(await limiter.check("1.2.3.4")).toBe("allowed");
  });

  it("never calls Redis", async () => {
    const { RateLimiter } = await importWithoutRedis();
    const limiter = new RateLimiter({ tokens: 1, windowSeconds: 60 }, "test");

    await limiter.check("1.2.3.4");
    expect(sharedLimit).not.toHaveBeenCalled();
  });
});

describe("shared window (Redis configured)", () => {
  it("reports the Redis verdict", async () => {
    const { RateLimiter } = await importWithRedis();
    const limiter = new RateLimiter({ tokens: 5, windowSeconds: 60 }, "test");

    sharedLimit.mockResolvedValueOnce({ success: true });
    expect(await limiter.check("1.2.3.4")).toBe("allowed");

    sharedLimit.mockResolvedValueOnce({ success: false });
    expect(await limiter.check("1.2.3.4")).toBe("limited");
  });

  it("falls back to the in-memory window when Redis is unreachable", async () => {
    const { RateLimiter } = await importWithRedis();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const limiter = new RateLimiter({ tokens: 2, windowSeconds: 60 }, "test");
    sharedLimit.mockRejectedValue(new Error("getaddrinfo ENOTFOUND dead.upstash.io"));

    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("allowed");
    expect(await limiter.check("1.2.3.4")).toBe("limited");
    expect(logged).toHaveBeenCalled();
  });

  it("logs the real cause without leaking it to the caller", async () => {
    const { RateLimiter } = await importWithRedis();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const limiter = new RateLimiter({ tokens: 1, windowSeconds: 60 }, "scan");
    const cause = new Error("getaddrinfo ENOTFOUND dead.upstash.io");
    sharedLimit.mockRejectedValue(cause);

    const verdict = await limiter.check("1.2.3.4");

    expect(verdict).toBe("allowed");
    expect(logged.mock.calls[0][0]).toContain('Rate limit "scan"');
    expect(logged.mock.calls[0][1]).toBe(cause);
  });
});

describe("clientKey", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("https://example.com/api/scan", { method: "POST", headers });

  it("takes the first entry of x-forwarded-for", async () => {
    const { clientKey } = await importWithoutRedis();
    expect(clientKey(withHeaders({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to a shared local bucket", async () => {
    const { clientKey } = await importWithoutRedis();
    expect(clientKey(withHeaders({}))).toBe("local");
  });
});
