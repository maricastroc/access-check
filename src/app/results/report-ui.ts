import type { FindingView } from "@/lib/report/findings";
import type { FocusStop } from "@/lib/scan/keyboard";
import { captureOf, stopPlacement, type StopPlacement } from "@/lib/scan/placement";
import { VIEWPORT_CAPTURE, type ScanMarker, type ScanRegion } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { MessageKey, Translate } from "@/lib/i18n/t";

export type Layer = "markers" | "focus" | "none";

export const LAYER_RAIL: { key: Layer; label: MessageKey; title: MessageKey }[] = [
  { key: "markers", label: "layer.markersShort", title: "layer.markersTitle" },
  { key: "focus", label: "layer.focusShort", title: "layer.focusTitle" },
  { key: "none", label: "layer.none", title: "layer.noneTitle" },
];

export type StopView = {
  n: number;
  left: number;
  top: number;
  width: number;
  height: number;
  current: boolean;
  visible: boolean;
};

export function buildStopViews(
  stops: FocusStop[],
  selected: number | null,
  captureId: string = VIEWPORT_CAPTURE,
  regions: ScanRegion[] = [],
): StopView[] {
  const views: StopView[] = [];
  for (const stop of stops) {
    const placement = stopPlacement(stop, undefined, regions);
    if (placement.kind !== "placed" || placement.captureId !== captureId) continue;
    views.push({
      n: stop.n,
      left: placement.left,
      top: placement.top,
      width: placement.width,
      height: placement.height,
      current: stop.n === selected,
      visible: stop.focusVisible,
    });
  }
  return views;
}

export function selectedStopPlacement(
  stops: FocusStop[],
  selected: number | null,
  regions: ScanRegion[] = [],
): StopPlacement | null {
  if (selected === null) return null;
  return stopPlacement(
    stops.find((s) => s.n === selected),
    undefined,
    regions,
  );
}

export type ActiveCapture = {
  id: string;
  image: string | null;
  docY: number;
  missed?: ScanRegion["missed"];
};

export function captureById(
  id: string,
  screenshot: string | null,
  regions: ScanRegion[],
): ActiveCapture {
  if (id === VIEWPORT_CAPTURE) return { id, image: screenshot, docY: 0 };
  const region = regions.find((r) => r.id === id);
  if (!region) return { id: VIEWPORT_CAPTURE, image: screenshot, docY: 0 };
  return { id: region.id, image: region.image, docY: region.docY, missed: region.missed };
}

export function captureForFinding(finding: FindingView | null): string | null {
  const marker = finding?.markers[0];
  return marker ? captureOf(marker) : null;
}

export function markersOfCapture(views: MarkerView[], captureId: string): MarkerView[] {
  return views.filter((v) => captureOf(v.marker) === captureId);
}

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

export function stepFocusStop(
  stops: { n: number }[],
  current: number | null,
  delta: 1 | -1,
): number | null {
  if (stops.length === 0) return null;
  if (current === null) return delta === 1 ? stops[0].n : stops[stops.length - 1].n;
  const at = stops.findIndex((s) => s.n === current);
  if (at === -1) return stops[0].n;

  const next = at + delta;
  if (next < 0 || next >= stops.length) return null;
  return stops[next].n;
}
