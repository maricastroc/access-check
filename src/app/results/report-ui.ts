import type { FindingView } from "@/lib/report/findings";
import type { ScanMarker } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { MessageKey, Translate } from "@/lib/i18n/t";

export type Layer = "markers" | "none";

export const LAYER_RAIL: { key: Layer; label: MessageKey; title: MessageKey }[] = [
  { key: "markers", label: "layer.markersShort", title: "layer.markersTitle" },
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
