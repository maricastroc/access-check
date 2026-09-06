import { beforeEach, describe, expect, it } from "vitest";
import type { ScanResult } from "./types";
import { clearScanCache, recallScan, rememberScan } from "./result-cache";
import { SCAN_FRESH_MS } from "./cache-policy";

function result(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    url: "https://stripe.com",
    finalUrl: "https://stripe.com/",
    title: "Stripe",
    scannedElements: 120,
    durationMs: 12_000,
    scannedAt: new Date().toISOString(),
    screenshot: null,
    score: 82,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      passed: 30,
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

describe("scan result cache", () => {
  beforeEach(() => {
    clearScanCache();
  });

  it("answers to what was typed, what was scanned, and where the page landed", () => {
    const scan = result();
    rememberScan(scan, "stripe.com");

    for (const spelling of ["stripe.com", "STRIPE.com/", " https://stripe.com ", "stripe.com/"]) {
      expect(recallScan(spelling)).toBe(scan);
    }
  });

  it("misses on a page it never measured", () => {
    rememberScan(result(), "stripe.com");
    expect(recallScan("wikipedia.org")).toBeNull();
  });

  it("keeps no partial reading, since those are the ones worth re-running", () => {
    rememberScan(result({ partial: true }), "stripe.com");
    expect(recallScan("stripe.com")).toBeNull();
  });

  it("expires on the audit's own age, so revisiting can't keep a stale reading alive", () => {
    const old = new Date(Date.now() - SCAN_FRESH_MS - 1_000).toISOString();
    rememberScan(result({ scannedAt: old }), "stripe.com");
    expect(recallScan("stripe.com")).toBeNull();
  });

  it("holds a reading that is still inside the window", () => {
    const recent = new Date(Date.now() - SCAN_FRESH_MS / 2).toISOString();
    rememberScan(result({ scannedAt: recent }), "stripe.com");
    expect(recallScan("stripe.com")).not.toBeNull();
  });
});
