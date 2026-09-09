import type { ScanCapture, ScanMarker, ScanOverview, ScanResult } from "./types";
import { OVERVIEW_CAPTURE } from "./types";

export const SCAN_FRESH_MS = 5 * 60 * 1000;

export const SCAN_FRESH_SECONDS = SCAN_FRESH_MS / 1000;

export const MAX_CACHED_SCREENSHOT_CHARS = 1_000_000;

export const MAX_CACHED_CAPTURE_CHARS = 700_000;

export const MAX_CACHED_OVERVIEW_CHARS = 1_000_000;

function overviewChars(overview: ScanOverview): number {
  return overview.tiles.reduce((sum, tile) => sum + tile.image.length, 0);
}

function keepWithinBudget(captures: ScanCapture[]): ScanCapture[] {
  const kept: ScanCapture[] = [];
  let left = MAX_CACHED_CAPTURE_CHARS;

  for (const capture of captures) {
    if (capture.image.length > left) break;
    left -= capture.image.length;
    kept.push(capture);
  }

  return kept;
}

function demoteDroppedMarkers(markers: ScanMarker[], kept: Set<string>): ScanMarker[] {
  return markers.map((marker) =>
    marker.captureId === OVERVIEW_CAPTURE || kept.has(marker.captureId)
      ? marker
      : { ...marker, captureId: OVERVIEW_CAPTURE, evidence: "unavailable" as const },
  );
}

function demoteOverviewMarkers(markers: ScanMarker[]): ScanMarker[] {
  return markers.map((marker) =>
    marker.captureId === OVERVIEW_CAPTURE && marker.doc
      ? { ...marker, evidence: "unavailable" as const }
      : marker,
  );
}

export function trimForCache(result: ScanResult): ScanResult {
  let trimmed = result;

  const shot = trimmed.screenshot;
  if (shot && shot.length > MAX_CACHED_SCREENSHOT_CHARS) {
    trimmed = { ...trimmed, screenshot: null };
  }

  const overview = trimmed.overview;
  if (overview && overviewChars(overview) > MAX_CACHED_OVERVIEW_CHARS) {
    trimmed = {
      ...trimmed,
      overview: undefined,
      markers: demoteOverviewMarkers(trimmed.markers),
    };
  }

  const captures = trimmed.captures ?? [];
  if (captures.length > 0) {
    const kept = keepWithinBudget(captures);
    if (kept.length !== captures.length) {
      const ids = new Set(kept.map((c) => c.id));
      trimmed = {
        ...trimmed,
        captures: kept,
        markers: demoteDroppedMarkers(trimmed.markers, ids),
      };
    }
  }

  return trimmed;
}
