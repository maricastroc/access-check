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
