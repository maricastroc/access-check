import { describe, expect, it } from "vitest";
import type { ScanResult } from "./types";
import { MAX_CACHED_SCREENSHOT_CHARS, trimForCache } from "./cache-policy";

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://example.com",
    title: "t",
    scannedElements: 10,
    durationMs: 1,
    screenshot: null,
    score: 80,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      passed: 20,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "s",
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

describe("what a reading carries into the cache", () => {
  it("keeps a screenshot that fits", () => {
    const shot = `data:image/jpeg;base64,${"a".repeat(1000)}`;
    expect(trimForCache(result({ screenshot: shot })).screenshot).toBe(shot);
  });

  it("drops a screenshot too large to store", () => {
    const shot = "a".repeat(MAX_CACHED_SCREENSHOT_CHARS + 1);
    expect(trimForCache(result({ screenshot: shot })).screenshot).toBeNull();
  });

  it("leaves the rest of the reading untouched", () => {
    const original = result({
      markers: [{ n: 1, severity: "serious", label: "x", left: 1, top: 1, width: 1, height: 1 }],
    });
    expect(trimForCache(original)).toEqual(original);
  });
});

describe("what the cache drops first when a scan is heavy", () => {
  const region = (id: string, chars: number) => ({
    id,
    docY: 1_000,
    width: 1200,
    height: 800,
    image: `data:image/jpeg;base64,${"x".repeat(chars)}`,
    stops: [],
  });

  it("keeps a scan that fits, images and all", () => {
    const light = { ...result({}), screenshot: "data:x", regions: [region("r1", 1_000)] };
    expect(trimForCache(light as never)).toEqual(light);
  });

  it("drops the contextual captures before the first screenshot", () => {
    const heavy = {
      ...result({}),
      screenshot: `data:image/jpeg;base64,${"s".repeat(100_000)}`,
      regions: [region("r1", 600_000), region("r2", 600_000)],
    };
    const trimmed = trimForCache(heavy as never);

    expect(trimmed.screenshot).toBe(heavy.screenshot);
    expect(trimmed.regions?.every((r) => r.image === null)).toBe(true);
    expect(trimmed.regions?.every((r) => r.missed === "bytes")).toBe(true);
  });

  it("drops the first screenshot only when dropping the regions was not enough", () => {
    const enormous = {
      ...result({}),
      screenshot: `data:image/jpeg;base64,${"s".repeat(2_000_000)}`,
      regions: [region("r1", 10)],
    };
    const trimmed = trimForCache(enormous as never);

    expect(trimmed.screenshot).toBeNull();
    expect(trimmed.regions?.[0].image).toBeNull();
  });
});
