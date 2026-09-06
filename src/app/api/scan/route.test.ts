import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@/lib/scan/types";
import { SCAN_FRESH_MS, SCAN_FRESH_SECONDS } from "@/lib/scan/cache-policy";

const auth = vi.fn();
const runScan = vi.fn();
const cacheGet = vi.fn();
const cacheSet = vi.fn();
const findRecentScan = vi.fn();
const saveScan = vi.fn();

vi.mock("@/auth", () => ({ auth }));

vi.mock("@/lib/scan/scan", () => ({
  runScan,
  normalizeUrl: (v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`),
  ScanFailure: class ScanFailure extends Error {},
}));

vi.mock("@/lib/redis", () => ({
  redis: null,
  namespaced: (key: string) => `access-check:${key}`,
  cacheGet,
  cacheSet,
}));

vi.mock("@/lib/scans", () => ({ findRecentScan, saveScan }));

vi.mock("@/lib/scan/ssrf", () => ({
  assertPublicUrl: vi.fn(async () => {}),
  BlockedUrlError: class BlockedUrlError extends Error {},
}));

const { POST } = await import("./route");

const SHOT = "data:image/jpeg;base64,AAAA";

function result(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    scannedElements: 16,
    durationMs: 2_100,
    scannedAt: new Date().toISOString(),
    screenshot: SHOT,
    score: 100,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 14,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "",
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...overrides,
  };
}

let client = 0;

function post(body: Record<string, unknown>): Promise<Response> {
  client += 1;
  return POST(
    new Request("https://audit.test/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${client}` },
      body: JSON.stringify(body),
    }),
  );
}

async function eventsOf(res: Response) {
  const text = await res.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; result?: ScanResult });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  auth.mockResolvedValue(null);
  cacheGet.mockResolvedValue(null);
  cacheSet.mockResolvedValue(undefined);
  findRecentScan.mockResolvedValue(null);
  runScan.mockResolvedValue(result());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/scan", () => {
  it("answers an anonymous repeat from the shared cache, screenshot and all", async () => {
    cacheGet.mockResolvedValue(result({ title: "From cache" }));

    const events = await eventsOf(await post({ url: "example.com" }));

    expect(runScan).not.toHaveBeenCalled();
    expect(cacheGet).toHaveBeenCalledWith("scan:https://example.com");
    expect(events).toEqual([
      {
        type: "result",
        result: expect.objectContaining({ title: "From cache", screenshot: SHOT }),
      },
    ]);
  });

  it("reuses a signed-in reader's own recent audit instead of the shared cache", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    findRecentScan.mockResolvedValue(result({ title: "From history" }));

    const events = await eventsOf(await post({ url: "example.com" }));

    expect(runScan).not.toHaveBeenCalled();
    expect(cacheGet).not.toHaveBeenCalled();
    expect(findRecentScan).toHaveBeenCalledWith("user-1", "https://example.com", SCAN_FRESH_MS);
    expect(events[0].result?.title).toBe("From history");
  });

  it("measures again when the reader asks for a re-audit", async () => {
    cacheGet.mockResolvedValue(result({ title: "From cache" }));

    const events = await eventsOf(await post({ url: "example.com", force: true }));

    expect(cacheGet).not.toHaveBeenCalled();
    expect(runScan).toHaveBeenCalledOnce();
    expect(events.at(-1)?.result?.title).toBe("Example");
  });

  it("keeps the screenshot in the entry it writes for anonymous readers", async () => {
    await eventsOf(await post({ url: "example.com" }));

    expect(cacheSet).toHaveBeenCalledWith(
      "scan:https://example.com",
      expect.objectContaining({ screenshot: SHOT }),
      SCAN_FRESH_SECONDS,
    );
  });

  it("drops a freakishly heavy screenshot rather than skipping the entry", async () => {
    runScan.mockResolvedValue(result({ screenshot: `data:image/jpeg;base64,${"A".repeat(2e6)}` }));

    await eventsOf(await post({ url: "example.com" }));

    expect(cacheSet).toHaveBeenCalledWith(
      "scan:https://example.com",
      expect.objectContaining({ screenshot: null }),
      SCAN_FRESH_SECONDS,
    );
  });

  it("leaves a partial reading out of the cache", async () => {
    runScan.mockResolvedValue(result({ partial: true }));

    await eventsOf(await post({ url: "example.com" }));

    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("writes a signed-in reader's audit to history, not to the shared cache", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });

    await eventsOf(await post({ url: "example.com" }));

    expect(saveScan).toHaveBeenCalledWith("user-1", expect.objectContaining({ score: 100 }));
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
