import { afterEach, describe, expect, it, vi } from "vitest";
import { isProd } from "./env";
import { rateLimitMissingInProd } from "./redis";
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
