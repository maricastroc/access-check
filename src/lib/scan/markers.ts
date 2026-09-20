import { VIEWPORT_CAPTURE, type ScanMarker, type Severity } from "./types";
import type { DomRect } from "./dom/rects";
import { firstTarget, type AxeRule } from "./violations";

export const MAX_MARKERS = 6;

export type MarkerTarget = { selector: string; severity: Severity; label: string };

function place(
  target: MarkerTarget,
  r: DomRect,
  viewport: { width: number; height: number },
  n: number,
): ScanMarker {
  const top = Math.max(0, r.y);
  const height = Math.min(r.h - (top - r.y), viewport.height - top);
  return {
    n,
    captureId: VIEWPORT_CAPTURE,
    severity: target.severity,
    label: target.label,
    left: (r.x / viewport.width) * 100,
    top: (top / viewport.height) * 100,
    width: (r.w / viewport.width) * 100,
    height: (Math.max(height, 4) / viewport.height) * 100,
  };
}

export type MarkerNumbers = Map<number, number>;

export function placeMarkers(
  targets: MarkerTarget[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
  captureId: string,
  numbers: MarkerNumbers = new Map(),
): ScanMarker[] {
  const markers: ScanMarker[] = [];

  targets.forEach((target, i) => {
    if (markers.length >= MAX_MARKERS) return;
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0) return;
    if (r.y < 0 || r.y > viewport.height || r.x > viewport.width) return;
    if (r.w >= viewport.width * 0.9 && r.h >= viewport.height * 0.9) return;

    let n = numbers.get(i);
    if (n === undefined) {
      n = numbers.size + 1;
      numbers.set(i, n);
    }
    markers.push({ ...place(target, r, viewport, n), captureId });
  });

  return markers;
}

export function buildMarkers(
  targets: MarkerTarget[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
  numbers?: MarkerNumbers,
): ScanMarker[] {
  return placeMarkers(targets, rects, viewport, VIEWPORT_CAPTURE, numbers);
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
