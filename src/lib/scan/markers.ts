import { OVERVIEW_CAPTURE, type ScanMarker, type Severity } from "./types";
import type { DocRect, DomRect } from "./dom/rects";
import { firstTarget, type AxeRule } from "./violations";

export const MAX_MARKERS = 6;

export const MAX_EXTRA_CAPTURES = 4;
export const CAPTURE_EDGE_PADDING = 24;
export const MAX_CAPTURE_CHARS = 700_000;

export type MarkerTarget = { selector: string; severity: Severity; label: string };

export type CaptureGroup = {
  captureId: string;
  lead: number;
  members: number[];
  docY: number;
};

function place(
  target: MarkerTarget,
  r: DomRect,
  viewport: { width: number; height: number },
  n: number,
  captureId: string,
  evidence: ScanMarker["evidence"],
): ScanMarker {
  const top = Math.max(0, r.y);
  const height = Math.min(r.h - (top - r.y), viewport.height - top);
  return {
    n,
    severity: target.severity,
    label: target.label,
    left: (r.x / viewport.width) * 100,
    top: (top / viewport.height) * 100,
    width: (r.w / viewport.width) * 100,
    height: (Math.max(height, 4) / viewport.height) * 100,
    captureId,
    evidence,
  };
}

export function fitsViewport(
  r: DomRect,
  viewport: { width: number; height: number },
  atEnd = false,
): boolean {
  if (r.w === 0 || r.h === 0) return false;
  if (r.y < CAPTURE_EDGE_PADDING) return false;
  const room = atEnd ? viewport.height : viewport.height - CAPTURE_EDGE_PADDING;
  if (r.y + Math.min(r.h, viewport.height) > room) return false;
  if (r.x > viewport.width) return false;
  return true;
}

export function numberTargets(
  targets: MarkerTarget[],
  rects: (DocRect | null)[],
  max: number = MAX_MARKERS,
): number[] {
  const numbered: number[] = [];

  targets.forEach((_, i) => {
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0) return;
    if (numbered.length >= max) return;
    numbered.push(i);
  });

  return numbered;
}

export function overviewMarkers(
  targets: MarkerTarget[],
  rects: (DocRect | null)[],
  page: { width: number; height: number },
  numbered: number[] = numberTargets(targets, rects),
): ScanMarker[] {
  const markers: ScanMarker[] = [];
  if (page.height <= 0 || page.width <= 0) return markers;

  numbered.forEach((i, position) => {
    const r = rects[i];
    if (!landsOnOverview(r, page.height)) return;
    markers.push(placeInDocument(targets[i], r!, page, position + 1));
  });

  return markers;
}

export function landsOnOverview(r: DocRect | null, capturedHeight: number): r is DocRect {
  if (!r || r.w === 0 || r.h === 0) return false;
  if (r.pinned) return false;
  if (r.docY < 0 || r.docY >= capturedHeight) return false;
  return true;
}

export function centeredMargin(
  height: number,
  viewport: { width: number; height: number },
  inset: number,
): number {
  const centred = (viewport.height - Math.min(height, viewport.height)) / 2;
  return Math.max(inset + CAPTURE_EDGE_PADDING + 8, Math.round(centred));
}

function placeInDocument(
  target: MarkerTarget,
  r: DocRect,
  page: { width: number; height: number },
  n: number,
): ScanMarker {
  const top = Math.max(0, r.docY);
  const bottom = Math.min(r.docY + r.h, page.height);
  const height = Math.max(bottom - top, 4);
  const left = Math.max(0, r.docX);
  const width = Math.max(Math.min(r.docX + r.w, page.width) - left, 4);

  return {
    n,
    severity: target.severity,
    label: target.label,
    left: (left / page.width) * 100,
    top: (top / page.height) * 100,
    width: (width / page.width) * 100,
    height: (height / page.height) * 100,
    captureId: OVERVIEW_CAPTURE,
    evidence: "captured",
    doc: { x: r.docX, y: r.docY, w: r.w, h: r.h },
  };
}

export function buildMarkers(
  targets: MarkerTarget[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
  numbered?: number[],
): ScanMarker[] {
  const markers: ScanMarker[] = [];
  const order = numbered ?? targets.map((_, i) => i).slice(0, MAX_MARKERS);

  order.forEach((i, position) => {
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0) return;
    if (r.y < 0 || r.y > viewport.height || r.x > viewport.width) return;
    if (r.w >= viewport.width * 0.9 && r.h >= viewport.height * 0.9) return;
    markers.push(place(targets[i], r, viewport, position + 1, OVERVIEW_CAPTURE, "captured"));
  });

  return markers;
}

export function markerFromCrop(
  target: MarkerTarget,
  r: DomRect,
  viewport: { width: number; height: number },
  n: number,
  captureId: string,
  evidence: ScanMarker["evidence"],
): ScanMarker {
  return place(target, r, viewport, n, captureId, evidence);
}

export function unavailableMarker(target: MarkerTarget, n: number): ScanMarker {
  return {
    n,
    severity: target.severity,
    label: target.label,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    captureId: OVERVIEW_CAPTURE,
    evidence: "unavailable",
  };
}

export function orderByDocument(indexes: number[], rects: (DocRect | null)[]): number[] {
  return [...indexes].sort((a, b) => (rects[a]?.docY ?? 0) - (rects[b]?.docY ?? 0));
}

export function markerTargets(violations: AxeRule[]): MarkerTarget[] {
  const targets: MarkerTarget[] = [];
  for (const v of violations) {
    const sel = firstTarget(v.nodes[0]?.target);
    if (sel)
      targets.push({ selector: sel, severity: (v.impact ?? "minor") as Severity, label: v.help });
  }
  return targets;
}
