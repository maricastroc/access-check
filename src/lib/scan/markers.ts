import type { ScanMarker, Severity } from "./types";
import type { DomRect } from "./dom/rects";
import { firstTarget, type AxeRule } from "./violations";

export const MAX_MARKERS = 6;

export type MarkerTarget = { selector: string; severity: Severity; label: string };

export function buildMarkers(
  targets: MarkerTarget[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
  max: number = MAX_MARKERS,
): ScanMarker[] {
  const markers: ScanMarker[] = [];

  targets.forEach((t, i) => {
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0) return;
    if (r.y < 0 || r.y > viewport.height || r.x > viewport.width) return;
    if (r.w >= viewport.width * 0.9 && r.h >= viewport.height * 0.9) return;
    if (markers.length >= max) return;
    markers.push({
      n: markers.length + 1,
      severity: t.severity,
      label: t.label,
      left: (r.x / viewport.width) * 100,
      top: (r.y / viewport.height) * 100,
      width: (r.w / viewport.width) * 100,
      height: (r.h / viewport.height) * 100,
    });
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
