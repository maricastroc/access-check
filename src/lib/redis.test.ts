import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const set = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = get;
    set = set;
  },
}));

async function importConfigured() {
  vi.resetModules();
  vi.stubEnv("KV_REST_API_URL", "https://stub.upstash.io");
  vi.stubEnv("KV_REST_API_TOKEN", "stub-token");
  return import("./redis");
}

beforeEach(() => {
  get.mockReset();
  set.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cacheGet", () => {
  it("returns the cached value on a hit", async () => {
    const { cacheGet } = await importConfigured();
    get.mockResolvedValue({ score: 42 });
    expect(await cacheGet<{ score: number }>("scan:x")).toEqual({ score: 42 });
  });

  it("degrades to a miss when Redis is unreachable", async () => {
    const { cacheGet } = await importConfigured();
    const logged = vi.spyOn(console, "warn").mockImplementation(() => {});
    get.mockRejectedValue(new Error("getaddrinfo ENOTFOUND dead.upstash.io"));

    expect(await cacheGet("scan:x")).toBeNull();
    // One JSON line, searchable by event name — not free text a human has to grep.
    const entry = JSON.parse(logged.mock.calls[0][0] as string);
    expect(entry.event).toBe("cache.read.failed");
    expect(entry.level).toBe("warn");
    expect(entry.key).toBe("scan:x");
    expect(entry.errorMessage).toContain("ENOTFOUND");
  });

  it("returns a miss when Redis is not configured at all", async () => {
    vi.resetModules();
    const { cacheGet } = await import("./redis");
    expect(await cacheGet("scan:x")).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("cacheSet", () => {
  it("writes through with the given TTL", async () => {
    const { cacheSet } = await importConfigured();
    set.mockResolvedValue("OK");

    await cacheSet("scan:x", { score: 42 }, 300);
    expect(set).toHaveBeenCalledWith("scan:x", { score: 42 }, { ex: 300 });
  });

  it("swallows an outage so a finished scan still resolves", async () => {
    const { cacheSet } = await importConfigured();
    const logged = vi.spyOn(console, "warn").mockImplementation(() => {});
    set.mockRejectedValue(new Error("getaddrinfo ENOTFOUND dead.upstash.io"));

    await expect(cacheSet("scan:x", { score: 42 }, 300)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
  });

  it("is a no-op when Redis is not configured at all", async () => {
    vi.resetModules();
    const { cacheSet } = await import("./redis");
    await cacheSet("scan:x", { score: 42 }, 300);
    expect(set).not.toHaveBeenCalled();
  });
});
