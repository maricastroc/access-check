import { describe, expect, it } from "vitest";
import type { ScanResult } from "./types";
import {
  MAX_CACHED_SCREENSHOT_CHARS,
  SCAN_FRESH_MS,
  SCAN_FRESH_SECONDS,
  trimForCache,
} from "./cache-policy";

const result = (screenshot: string | null): ScanResult => ({ screenshot }) as ScanResult;

describe("trimForCache", () => {
  it("keeps an ordinary capture, so a cache hit still opens with its evidence", () => {
    const shot = `data:image/jpeg;base64,${"A".repeat(200_000)}`;
    expect(trimForCache(result(shot)).screenshot).toBe(shot);
  });

  it("drops a capture too heavy to travel, caching the reading without it", () => {
    const shot = `data:image/jpeg;base64,${"A".repeat(MAX_CACHED_SCREENSHOT_CHARS)}`;
    expect(trimForCache(result(shot)).screenshot).toBeNull();
  });

  it("passes a captureless reading through untouched", () => {
    const reading = result(null);
    expect(trimForCache(reading)).toBe(reading);
  });
});

describe("freshness window", () => {
  it("states the same window in both units", () => {
    expect(SCAN_FRESH_SECONDS).toBe(SCAN_FRESH_MS / 1000);
  });
});
