import { describe, expect, it } from "vitest";
import {
  capturedHeightOf,
  MAX_OVERVIEW_HEIGHT,
  MAX_OVERVIEW_TILES,
  OVERVIEW_FALLBACK_SCALE,
  OVERVIEW_SCALE,
  OVERVIEW_TILE_HEIGHT,
  planTiles,
  shouldRetrySmaller,
} from "./overview-plan";
import type { OverviewTile } from "./types";

function coverage(tiles: { docY: number; docHeight: number }[]) {
  return tiles.map((t) => [t.docY, t.docY + t.docHeight]);
}

describe("planning the overview blocks", () => {
  it("covers a page of about 15,000px end to end", () => {
    const { tiles, stoppedBy } = planTiles(15_000);

    expect(tiles).toHaveLength(8);
    expect(stoppedBy).toBe("complete");
    expect(capturedHeightOf(tiles as OverviewTile[])).toBe(15_000);
  });

  it("leaves no gap and no overlap between neighbouring blocks", () => {
    const { tiles } = planTiles(15_000);

    expect(coverage(tiles)).toEqual([
      [0, 2000],
      [2000, 4000],
      [4000, 6000],
      [6000, 8000],
      [8000, 10000],
      [10000, 12000],
      [12000, 14000],
      [14000, 15000],
    ]);
  });

  it("takes one block, cut to size, for a page shorter than a block", () => {
    const { tiles, stoppedBy } = planTiles(900);

    expect(tiles).toEqual([{ docY: 0, docHeight: 900 }]);
    expect(stoppedBy).toBe("complete");
  });

  it("stops at the auditable height on a page taller than the ceiling", () => {
    const { tiles, stoppedBy } = planTiles(40_000);

    expect(tiles).toHaveLength(MAX_OVERVIEW_TILES);
    expect(stoppedBy).toBe("height");
    expect(capturedHeightOf(tiles as OverviewTile[])).toBe(MAX_OVERVIEW_HEIGHT);
  });

  it("asks for nothing on a page with no height to photograph", () => {
    expect(planTiles(0).tiles).toEqual([]);
    expect(planTiles(-10).tiles).toEqual([]);
  });

  it("keeps the ceiling equal to the blocks it allows", () => {
    expect(MAX_OVERVIEW_TILES * OVERVIEW_TILE_HEIGHT).toBe(MAX_OVERVIEW_HEIGHT);
  });
});

describe("falling back to a smaller overview", () => {
  const attempt = (over: Partial<Parameters<typeof shouldRetrySmaller>[0]> = {}) => ({
    stoppedBy: "bytes" as const,
    captured: 4,
    planned: 8,
    timeLeftMs: 2_000,
    spentMs: 800,
    ...over,
  });

  it("photographs the page again, smaller, when weight cut it short", () => {
    expect(shouldRetrySmaller(attempt())).toBe(true);
  });

  it("leaves a page that was covered end to end alone", () => {
    expect(shouldRetrySmaller(attempt({ captured: 8, planned: 8 }))).toBe(false);
  });

  it("does not trade sharpness away when weight was never the problem", () => {
    expect(shouldRetrySmaller(attempt({ stoppedBy: "height" }))).toBe(false);
    expect(shouldRetrySmaller(attempt({ stoppedBy: "time" }))).toBe(false);
    expect(shouldRetrySmaller(attempt({ stoppedBy: "error" }))).toBe(false);
  });

  it("keeps what it has rather than starting a second pass it cannot finish", () => {
    expect(shouldRetrySmaller(attempt({ timeLeftMs: 300, spentMs: 900 }))).toBe(false);
  });

  it("reaches for a scale that actually costs less than the one that failed", () => {
    expect(OVERVIEW_FALLBACK_SCALE).toBeLessThan(OVERVIEW_SCALE);
  });
});
