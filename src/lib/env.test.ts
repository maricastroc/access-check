import { afterEach, describe, expect, it, vi } from "vitest";
import { isProd } from "./env";
import { checkRateLimit, rateLimitMissingInProd } from "./redis";
import { verifyQstashSignature } from "./qstash";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isProd", () => {
  it("is true only when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProd()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(isProd()).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(isProd()).toBe(false);
  });
});

describe("rateLimitMissingInProd", () => {
  it("blocks when Redis is missing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(rateLimitMissingInProd()).toBe(true);
  });

  it("stays permissive in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(rateLimitMissingInProd()).toBe(false);
  });
});

describe("checkRateLimit", () => {
  const limiter = (impl: () => Promise<{ success: boolean }>) =>
    ({ limit: impl }) as unknown as Parameters<typeof checkRateLimit>[0];

  it("allows when no limiter is configured", async () => {
    expect(await checkRateLimit(null, "1.2.3.4")).toBe("allowed");
  });

  it("reports the limiter verdict", async () => {
    expect(
      await checkRateLimit(
        limiter(async () => ({ success: true })),
        "1.2.3.4",
      ),
    ).toBe("allowed");
    expect(
      await checkRateLimit(
        limiter(async () => ({ success: false })),
        "1.2.3.4",
      ),
    ).toBe("limited");
  });

  it("fails closed in production when Redis is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const down = limiter(() => Promise.reject(new Error("getaddrinfo ENOTFOUND")));
    expect(await checkRateLimit(down, "1.2.3.4")).toBe("unavailable");
  });

  it("stays permissive in development when Redis is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const down = limiter(() => Promise.reject(new Error("getaddrinfo ENOTFOUND")));
    expect(await checkRateLimit(down, "1.2.3.4")).toBe("allowed");
  });
});

describe("verifyQstashSignature (no signing keys configured)", () => {
  const req = new Request("https://example.com/api/site-scan/page", { method: "POST" });

  it("fails closed in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await verifyQstashSignature(req, "{}")).toBe(false);
  });

  it("stays open in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await verifyQstashSignature(req, "{}")).toBe(true);
  });
});
