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

  if (capture.tiles && capture.capturedHeight) {
    const height = capture.capturedHeight;
    return placed
      .filter((p) => p.docY >= 0 && p.docY <= height)
      .map((p) => ({ ...p, cx: (p.docX / capture.width) * 100, cy: (p.docY / height) * 100 }));
  }

  if (capture.id !== OVERVIEW_CAPTURE) {
    const top = capture.docY ?? 0;
    return placed
      .filter((p) => p.docY >= top && p.docY <= top + capture.height)
      .map((p) => ({
        ...p,
        cx: (p.docX / capture.width) * 100,
        cy: ((p.docY - top) / capture.height) * 100,
      }));
  }

  return points;
}

export function scrollTargetFor(topPct: number, columnHeight: number, boxHeight: number): number {
  if (columnHeight <= boxHeight) return 0;
  const centred = (topPct / 100) * columnHeight - boxHeight / 2;
  return Math.max(0, Math.min(centred, columnHeight - boxHeight));
}

export function captureForFinding(finding: FindingView | null): string | null {
  const usable = (finding?.markers ?? []).filter((m) => m.evidence !== "unavailable");
  const evidence = usable.find((m) => m.captureId !== OVERVIEW_CAPTURE);
  return (evidence ?? usable[0])?.captureId ?? null;
}

export function markersOfCapture(views: MarkerView[], captureId: string): MarkerView[] {
  return views.filter(
    (v) => v.marker.captureId === captureId && v.marker.evidence !== "unavailable",
  );
}
