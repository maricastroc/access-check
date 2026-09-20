import { type ScanMarker, type Severity } from "./types";
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
    severity: target.severity,
    label: target.label,
    left: (r.x / viewport.width) * 100,
    top: (top / viewport.height) * 100,
    width: (r.w / viewport.width) * 100,
    height: (Math.max(height, 4) / viewport.height) * 100,
  };
}

export function buildMarkers(
  targets: MarkerTarget[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
): ScanMarker[] {
  const markers: ScanMarker[] = [];

  targets.slice(0, MAX_MARKERS).forEach((target, i) => {
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0) return;
    if (r.y < 0 || r.y > viewport.height || r.x > viewport.width) return;
    if (r.w >= viewport.width * 0.9 && r.h >= viewport.height * 0.9) return;
    markers.push(place(target, r, viewport, markers.length + 1));
  });

  return markers;
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
