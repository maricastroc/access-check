import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@/lib/scan/types";

const create = vi.fn().mockResolvedValue({ id: "scan-1" });
const findFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: { scan: { create, findFirst } } }));
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));

const { saveScan, findRecentScan } = await import("./scans");
const { PARTIAL_FRESH_MS, SCAN_FRESH_MS } = await import("./scan/cache-policy");
const { SCORING_VERSION } = await import("./scan/scored");

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

describe("reusing a signed-in reader's recent audit", () => {
  const row = (over: Partial<ScanResult>, ageMs: number) => ({
    id: "scan-9",
    createdAt: new Date(Date.now() - ageMs),
    result: result({ scoringVersion: SCORING_VERSION, ...over }),
  });

  beforeEach(() => {
    findFirst.mockReset();
  });

  it("reuses a whole audit inside the full window", async () => {
    findFirst.mockResolvedValue(row({}, SCAN_FRESH_MS - 10_000));
    expect(await findRecentScan("user-1", "https://example.com", SCAN_FRESH_MS)).not.toBeNull();
  });

  it("reuses a partial audit while it is still recent", async () => {
    findFirst.mockResolvedValue(row({ partial: true }, PARTIAL_FRESH_MS - 10_000));
    const reused = await findRecentScan("user-1", "https://example.com", SCAN_FRESH_MS);
    expect(reused?.partial).toBe(true);
  });

  it("lets a partial audit go after its shorter window", async () => {
    findFirst.mockResolvedValue(row({ partial: true }, PARTIAL_FRESH_MS + 10_000));
    expect(await findRecentScan("user-1", "https://example.com", SCAN_FRESH_MS)).toBeNull();
  });

  it("will not reuse an audit an older scoring model produced", async () => {
    findFirst.mockResolvedValue(row({ scoringVersion: 1 }, 1_000));
    expect(await findRecentScan("user-1", "https://example.com", SCAN_FRESH_MS)).toBeNull();
  });
});
