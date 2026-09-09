import { describe, expect, it } from "vitest";
import type { ScanMarker, ScanOverview, ScanResult } from "./types";
import {
  MAX_CACHED_CAPTURE_CHARS,
  MAX_CACHED_OVERVIEW_CHARS,
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

describe("contextual captures under the cache budget", () => {
  const capture = (id: string, chars: number) => ({
    id,
    image: "d".repeat(chars),
    width: 1200,
    height: 800,
    docY: 0,
  });

  const withCaptures = (captures: ReturnType<typeof capture>[], markers: ScanMarker[]) =>
    ({ screenshot: null, captures, markers }) as unknown as ScanResult;

  it("keeps every capture that fits", () => {
    const result = withCaptures(
      [capture("c1", 100), capture("c2", 100)],
      [{ n: 1, captureId: "c2", evidence: "captured" } as ScanMarker],
    );

    const trimmed = trimForCache(result);
    expect(trimmed.captures).toHaveLength(2);
    expect(trimmed.markers[0].evidence).toBe("captured");
  });

  it("drops what overflows the budget instead of blowing the cache", () => {
    const result = withCaptures(
      [capture("c1", MAX_CACHED_CAPTURE_CHARS), capture("c2", 10)],
      [{ n: 1, captureId: "c2", evidence: "captured" } as ScanMarker],
    );

    expect(trimForCache(result).captures).toHaveLength(1);
  });

  it("tells the reader a dropped capture is gone rather than pointing at nothing", () => {
    const result = withCaptures(
      [capture("c1", MAX_CACHED_CAPTURE_CHARS), capture("c2", 10)],
      [{ n: 1, captureId: "c2", evidence: "captured" } as ScanMarker],
    );

    const marker = trimForCache(result).markers[0];
    expect(marker.evidence).toBe("unavailable");
    expect(marker.captureId).toBe("overview");
  });
});

describe("the page column against the cache budget", () => {
  const column = (chars: number) =>
    ({
      tiles: [{ image: "t".repeat(chars), docY: 0, docHeight: 2000, width: 600, height: 1000 }],
      scale: 0.5,
      pageWidth: 1200,
      documentHeight: 2000,
      capturedHeight: 2000,
      complete: true,
      stoppedBy: "complete",
    }) as ScanOverview;

  const withOverview = (overview: ScanOverview, markers: ScanMarker[]) =>
    ({ screenshot: null, overview, markers }) as unknown as ScanResult;

  const onColumn = (n: number) =>
    ({
      n,
      captureId: "overview",
      evidence: "captured",
      doc: { x: 0, y: 100, w: 10, h: 10 },
    }) as ScanMarker;

  it("keeps a column that fits", () => {
    const trimmed = trimForCache(withOverview(column(1_000), [onColumn(1)]));

    expect(trimmed.overview?.tiles).toHaveLength(1);
    expect(trimmed.markers[0].evidence).toBe("captured");
  });

  it("drops a column too heavy for the cache instead of blowing it", () => {
    const trimmed = trimForCache(
      withOverview(column(MAX_CACHED_OVERVIEW_CHARS + 1), [onColumn(1)]),
    );

    expect(trimmed.overview).toBeUndefined();
  });

  it("tells the reader the column is gone rather than pointing at nothing", () => {
    const trimmed = trimForCache(
      withOverview(column(MAX_CACHED_OVERVIEW_CHARS + 1), [onColumn(1)]),
    );

    expect(trimmed.markers[0].evidence).toBe("unavailable");
  });

  it("leaves the contextual crops alone when only the column is dropped", () => {
    const heavy = withOverview(column(MAX_CACHED_OVERVIEW_CHARS + 1), [
      onColumn(1),
      { n: 2, captureId: "c1", evidence: "captured" } as ScanMarker,
    ]);
    heavy.captures = [{ id: "c1", image: "small", width: 1200, height: 800, docY: 9000 }];

    const trimmed = trimForCache(heavy);

    expect(trimmed.captures).toHaveLength(1);
    expect(trimmed.markers[1]).toMatchObject({ captureId: "c1", evidence: "captured" });
  });

  it("leaves a legacy marker with no document box untouched", () => {
    const trimmed = trimForCache(
      withOverview(column(MAX_CACHED_OVERVIEW_CHARS + 1), [
        { n: 1, captureId: "overview", evidence: "captured" } as ScanMarker,
      ]),
    );

    expect(trimmed.markers[0].evidence).toBe("captured");
  });
});
