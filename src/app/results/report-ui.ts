import type { OverviewStop, OverviewTile, ScanMarker, ScanResult } from "@/lib/scan/types";
import { OVERVIEW_CAPTURE } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { FindingView } from "@/lib/report/findings";
import type { FocusPoint } from "./report-model";
import type { SimKey } from "./data";
import type { MessageKey, Translate } from "@/lib/i18n/t";

export type Layer = "markers" | "focus" | "none";

export const VISION_RAIL: { key: SimKey; label: MessageKey; title: MessageKey }[] = [
  { key: "normal", label: "vision.normal", title: "vision.normalTitle" },
  { key: "deuteranopia", label: "vision.deuteranopia", title: "vision.deuteranopiaTitle" },
  { key: "protanopia", label: "vision.protanopia", title: "vision.protanopiaTitle" },
  { key: "tritanopia", label: "vision.tritanopia", title: "vision.tritanopiaTitle" },
  { key: "lowvision", label: "vision.lowVision", title: "vision.lowVisionTitle" },
  { key: "grayscale", label: "vision.grayscale", title: "vision.grayscaleTitle" },
];

export const LAYER_RAIL: { key: Layer; label: MessageKey; title: MessageKey }[] = [
  { key: "markers", label: "layer.markersShort", title: "layer.markersTitle" },
  { key: "focus", label: "layer.focus", title: "layer.focusTitle" },
  { key: "none", label: "layer.none", title: "layer.noneTitle" },
];

export function markerLabel(finding: FindingView, t: Translate): string | undefined {
  if (finding.measurement) {
    return t("results.measuredNeeds", {
      measured: finding.measurement.measured.toFixed(1),
      required: finding.measurement.required.toFixed(1),
    });
  }
  if (finding.criterionSc) return finding.criterionSc;
  return undefined;
}

export type MarkerView = {
  marker: ScanMarker;
  state: MarkerState;
  dimmed: boolean;
  label?: string;
  findingId: string | null;
};

export function buildMarkerViews(
  markers: ScanMarker[],
  selected: FindingView | null,
  t: Translate,
): MarkerView[] {
  const selectedNs = new Set((selected?.markers ?? []).map((m) => m.n));

  return markers.map((marker) => {
    if (!selected) {
      return { marker, state: "idle" as MarkerState, dimmed: false, findingId: null };
    }
    const belongs = selectedNs.has(marker.n);
    return {
      marker,
      state: belongs ? ("selected" as MarkerState) : ("idle" as MarkerState),
      dimmed: !belongs,
      label: belongs ? markerLabel(selected, t) : undefined,
      findingId: belongs ? selected.id : null,
    };
  });
}

export type ActiveCapture = {
  id: string;
  image: string | null;
  width: number;
  height: number;
  tiles?: OverviewTile[];
  documentHeight?: number;
  capturedHeight?: number;
  scale?: number;
  partial?: boolean;
  stoppedBy?: OverviewStop;
  docY?: number;
};

export function captureById(result: ScanResult, id: string): ActiveCapture {
  const extra = (result.captures ?? []).find((c) => c.id === id);
  if (extra)
    return {
      id: extra.id,
      image: extra.image,
      width: extra.width,
      height: extra.height,
      docY: extra.docY,
    };

  const overview = result.overview;
  if (overview && overview.tiles.length > 0) {
    return {
      id: OVERVIEW_CAPTURE,
      image: overview.tiles[0].image,
      width: overview.pageWidth,
      height: overview.capturedHeight,
      tiles: overview.tiles,
      documentHeight: overview.documentHeight,
      capturedHeight: overview.capturedHeight,
      scale: overview.scale,
      partial: !overview.complete,
      stoppedBy: overview.stoppedBy,
    };
  }

  return { id: OVERVIEW_CAPTURE, image: result.screenshot, width: 1200, height: 800 };
}

export function focusOnCapture(points: FocusPoint[], capture: ActiveCapture): FocusPoint[] {
  const placed = points.filter(
    (p): p is FocusPoint & { docX: number; docY: number } => p.docX != null && p.docY != null,
  );

  const legacyOverview = !capture.tiles && capture.id === OVERVIEW_CAPTURE;
  if (placed.length === 0) return legacyOverview ? points : [];

  const height = capture.capturedHeight ?? capture.height;
  const top = capture.tiles ? 0 : (capture.docY ?? 0);

  return placed
    .filter((p) => p.docY >= top && p.docY <= top + height)
    .map((p) => ({
      ...p,
      cx: (p.docX / capture.width) * 100,
      cy: ((p.docY - top) / height) * 100,
    }));
}

const NEAR_DOC_PX = 800;

const NEAR_PCT = 20;

export type FocusSegment = {
  from: number;
  to: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FocusBreak = { at: number; to: number; direction: "down" | "up" };

export type FocusShape = { segments: FocusSegment[]; breaks: FocusBreak[] };

function near(a: FocusPoint, b: FocusPoint, nearDocPx: number): boolean {
  if (a.docY != null && b.docY != null) return Math.abs(b.docY - a.docY) <= nearDocPx;
  return Math.abs(b.cy - a.cy) <= NEAR_PCT;
}

export function focusPathShape(points: FocusPoint[], nearDocPx = NEAR_DOC_PX): FocusShape {
  const segments: FocusSegment[] = [];
  const breaks: FocusBreak[] = [];

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];

    if (near(from, to, nearDocPx)) {
      segments.push({ from: from.n, to: to.n, x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy });
      continue;
    }

    const direction = to.cy >= from.cy ? "down" : "up";
    breaks.push({ at: from.n, to: to.n, direction });
    breaks.push({ at: to.n, to: from.n, direction: direction === "down" ? "up" : "down" });
  }

  return { segments, breaks };
}

export function stepFocusStop(
  points: FocusPoint[],
  current: number | null,
  delta: 1 | -1,
): number | null {
  if (points.length === 0) return null;
  if (current === null) return delta === 1 ? points[0].n : points[points.length - 1].n;

  const at = points.findIndex((p) => p.n === current);
  if (at === -1) return points[0].n;

  const next = at + delta;
  if (next < 0 || next >= points.length) return null;
  return points[next].n;
}

export type InspectRegion = { x: number; y: number; w: number; h: number };

export type InspectOrigin = { x: number; y: number };

export function inspectionOrigin(
  region: InspectRegion,
  box: { width: number; height: number },
  page: { width: number; height: number },
): InspectOrigin {
  const place = (start: number, size: number, window: number, limit: number) => {
    if (window >= limit) return 0;
    const wanted = size >= window ? start : start + size / 2 - window / 2;
    return Math.round(Math.max(0, Math.min(wanted, limit - window)));
  };

  return {
    x: place(region.x, region.w, box.width, page.width),
    y: place(region.y, region.h, box.height, page.height),
  };
}

export function regionOnOverview(region: InspectRegion, page: { height: number }): boolean {
  return region.y >= 0 && region.y < page.height && region.w > 0 && region.h > 0;
}

export function scrollTargetFor(topPct: number, columnHeight: number, boxHeight: number): number {
  if (columnHeight <= boxHeight) return 0;
  const centred = (topPct / 100) * columnHeight - boxHeight / 2;
  return Math.max(0, Math.min(centred, columnHeight - boxHeight));
}

export function locatedOnOverview(finding: FindingView | null): boolean {
  return (finding?.markers ?? []).some(
    (m) => m.captureId === OVERVIEW_CAPTURE && m.doc !== undefined && m.evidence !== "unavailable",
  );
}

export function captureForFinding(finding: FindingView | null): string | null {
  if (locatedOnOverview(finding)) return OVERVIEW_CAPTURE;

  const usable = (finding?.markers ?? []).filter((m) => m.evidence !== "unavailable");
  const evidence = usable.find((m) => m.captureId !== OVERVIEW_CAPTURE);
  return (evidence ?? usable[0])?.captureId ?? null;
}

export function markersOfCapture(views: MarkerView[], captureId: string): MarkerView[] {
  return views.filter(
    (v) => v.marker.captureId === captureId && v.marker.evidence !== "unavailable",
  );
}
