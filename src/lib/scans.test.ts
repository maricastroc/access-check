import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanResult } from "@/lib/scan/types";

const create = vi.fn().mockResolvedValue({ id: "scan-1" });

vi.mock("@/lib/prisma", () => ({ prisma: { scan: { create } } }));
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));

const readTile = vi.fn();
vi.mock("@/lib/scan/tile-store", () => ({
  readTile,
  tileIdOf: (image: string) => (image.startsWith("/api/tile/") ? image.slice(10) : null),
}));

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
  readTile.mockReset();
  readTile.mockResolvedValue({ mimeType: "image/webp", data: "dGlsZQ==" });
});

const overviewOf = (images: string[]) => ({
  tiles: images.map((image, i) => ({
    image,
    docY: i * 2000,
    docHeight: 2000,
    width: 1200,
    height: 2000,
  })),
  scale: 1,
  pageWidth: 1200,
  documentHeight: images.length * 2000,
  capturedHeight: images.length * 2000,
  complete: true,
  stoppedBy: "complete" as const,
});

describe("what a saved scan keeps", () => {
  it("does not carry the page column into the history row", async () => {
    await saveScan("user-1", {
      ...result({}),
      overview: {
        tiles: [
          { image: "data:image/jpeg;base64,a", docY: 0, docHeight: 2000, width: 600, height: 1000 },
        ],
        scale: 0.5,
        pageWidth: 1200,
        documentHeight: 2000,
        capturedHeight: 2000,
        complete: true,
        stoppedBy: "complete",
      },
    });

    expect(stored().overview).toBeUndefined();
  });

  it("keeps the page column and stores each block alongside the row", async () => {
    await saveScan("user-1", {
      ...result({}),
      overview: overviewOf(["/api/tile/one", "/api/tile/two"]),
    });

    const data = create.mock.calls[0][0].data;
    expect(stored().overview?.tiles.map((t) => t.image)).toEqual([
      "/api/tile/one",
      "/api/tile/two",
    ]);
    expect(data.tiles.create).toEqual([
      { id: "one", docY: 0, data: Buffer.from("dGlsZQ==", "base64"), mimeType: "image/webp" },
      { id: "two", docY: 2000, data: Buffer.from("dGlsZQ==", "base64"), mimeType: "image/webp" },
    ]);
  });

  it("drops the page column when the blocks can no longer be read", async () => {
    readTile.mockResolvedValue(null);

    await saveScan("user-1", {
      ...result({}),
      overview: overviewOf(["/api/tile/gone"]),
    });

    expect(stored().overview).toBeUndefined();
    expect(create.mock.calls[0][0].data.tiles).toBeUndefined();
  });

  it("moves the screenshot out of the row, as it always did", async () => {
    await saveScan("user-1", result({ screenshot: "data:image/jpeg;base64,abc" }));

    expect(stored().screenshot).toBeNull();
    expect(create.mock.calls[0][0].data.screenshot).toBeDefined();
  });

  it("keeps the findings and their markers", async () => {
    await saveScan(
      "user-1",
      result({
        markers: [
          {
            n: 1,
            severity: "serious",
            label: "l",
            left: 1,
            top: 2,
            width: 3,
            height: 4,
            captureId: "overview",
            evidence: "captured",
            doc: { x: 0, y: 9000, w: 10, h: 10 },
          },
        ],
      }),
    );

    expect(stored().markers[0].doc).toEqual({ x: 0, y: 9000, w: 10, h: 10 });
  });
});
