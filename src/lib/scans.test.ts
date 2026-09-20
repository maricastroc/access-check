import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@/lib/scan/types";

const create = vi.fn().mockResolvedValue({ id: "scan-1" });

vi.mock("@/lib/prisma", () => ({ prisma: { scan: { create } } }));
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));

const { saveScan } = await import("./scans");

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    title: "Example",
    scannedElements: 10,
    durationMs: 1000,
    screenshot: null,
    score: 90,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 1,
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

const stored = () => create.mock.calls[0][0].data.result as ScanResult;

beforeEach(() => {
  create.mockClear();
});

describe("what a saved scan keeps", () => {
  it("moves the screenshot out of the row, as it always did", async () => {
    await saveScan("user-1", result({ screenshot: "data:image/jpeg;base64,abc" }));

    expect(stored().screenshot).toBeNull();
    expect(create.mock.calls[0][0].data.screenshot).toBeDefined();
  });
});
