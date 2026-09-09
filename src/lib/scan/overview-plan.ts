import type { OverviewStop, OverviewTile, ScanOverview } from "./types";

export const OVERVIEW_FORMAT = "webp";
export const OVERVIEW_MIME = "image/webp";
export const OVERVIEW_SCALE = 0.75;
export const OVERVIEW_FALLBACK_SCALE = 0.5;
export const OVERVIEW_TILE_HEIGHT = 2000;
export const MAX_OVERVIEW_TILES = 8;
export const MAX_OVERVIEW_HEIGHT = MAX_OVERVIEW_TILES * OVERVIEW_TILE_HEIGHT;
export const MAX_OVERVIEW_BYTES = 700 * 1024;
export const MAX_OVERVIEW_MS = 4_000;

export type TilePlan = { docY: number; docHeight: number };

export type TilePlanResult = { tiles: TilePlan[]; stoppedBy: OverviewStop };

export function planTiles(documentHeight: number): TilePlanResult {
  const height = Math.max(0, Math.floor(documentHeight));
  if (height === 0) return { tiles: [], stoppedBy: "complete" };

  const reach = Math.min(height, MAX_OVERVIEW_HEIGHT);
  const tiles: TilePlan[] = [];

  for (
    let docY = 0;
    docY < reach && tiles.length < MAX_OVERVIEW_TILES;
    docY += OVERVIEW_TILE_HEIGHT
  ) {
    tiles.push({ docY, docHeight: Math.min(OVERVIEW_TILE_HEIGHT, reach - docY) });
  }

  const covered = tiles.reduce((sum, tile) => sum + tile.docHeight, 0);
  if (covered >= height) return { tiles, stoppedBy: "complete" };
  return { tiles, stoppedBy: height > MAX_OVERVIEW_HEIGHT ? "height" : "tiles" };
}

export function shouldRetrySmaller(attempt: {
  stoppedBy: OverviewStop;
  captured: number;
  planned: number;
  timeLeftMs: number;
  spentMs: number;
}): boolean {
  if (attempt.stoppedBy !== "bytes") return false;
  if (attempt.captured >= attempt.planned) return false;
  return attempt.timeLeftMs >= attempt.spentMs;
}

export function capturedHeightOf(tiles: OverviewTile[]): number {
  return tiles.reduce((reach, tile) => Math.max(reach, tile.docY + tile.docHeight), 0);
}

export function emptyOverview(pageWidth: number, documentHeight: number): ScanOverview {
  return {
    tiles: [],
    scale: OVERVIEW_SCALE,
    pageWidth,
    documentHeight,
    capturedHeight: 0,
    complete: false,
    stoppedBy: "error",
  };
}
