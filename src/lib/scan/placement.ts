import type { FocusStop } from "./keyboard";
import {
  SCAN_VIEWPORT,
  VIEWPORT_CAPTURE,
  type RegionMiss,
  type ScanMarker,
  type ScanRegion,
} from "./types";

export type StopPlacement =
  | { kind: "placed"; captureId: string; left: number; top: number; width: number; height: number }
  | { kind: "inside-scroller"; context: string }
  | { kind: "outside"; docY: number }
  | { kind: "region-missed"; captureId: string; docY: number; reason: RegionMiss }
  | { kind: "unplaced" };

export function captureOf(marker: Pick<ScanMarker, "captureId">): string {
  return marker.captureId ?? VIEWPORT_CAPTURE;
}

export function readableContext(context: string): string | null {
  if (!context || context.includes(" > ")) return null;
  return context;
}

export function stopInRegion(regions: ScanRegion[], n: number): StopPlacement | null {
  for (const region of regions) {
    if (region.missed) continue;
    const found = region.stops.find((stop) => stop.n === n);
    if (found) {
      return {
        kind: "placed",
        captureId: region.id,
        left: found.left,
        top: found.top,
        width: found.width,
        height: found.height,
      };
    }
  }
  return null;
}

export function stopPlacement(
  stop: FocusStop | undefined,
  viewport = SCAN_VIEWPORT,
  regions: ScanRegion[] = [],
): StopPlacement {
  const rect = stop?.rect;
  if (!rect || rect.docX == null || rect.docY == null) return { kind: "unplaced" };

  if (rect.scrolled) {
    return { kind: "inside-scroller", context: rect.flowContext || stop!.selector };
  }

  const within =
    rect.docY >= 0 && rect.docY <= viewport.height && rect.docX >= 0 && rect.docX <= viewport.width;
  if (!within) {
    const inRegion = stopInRegion(regions, stop!.n);
    if (inRegion) return inRegion;

    const docY = rect.docY;
    const missed = regions.find(
      (region) => region.missed && docY >= region.docY && docY <= region.docY + region.height,
    );
    if (missed?.missed) {
      return {
        kind: "region-missed",
        captureId: missed.id,
        docY: Math.round(rect.docY),
        reason: missed.missed,
      };
    }

    return { kind: "outside", docY: Math.round(rect.docY) };
  }

  const height = Math.min(rect.h, viewport.height - rect.docY);
  return {
    kind: "placed",
    captureId: VIEWPORT_CAPTURE,
    left: (rect.docX / viewport.width) * 100,
    top: (rect.docY / viewport.height) * 100,
    width: (rect.w / viewport.width) * 100,
    height: (Math.max(height, 4) / viewport.height) * 100,
  };
}
