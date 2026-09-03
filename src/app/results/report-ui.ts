import type { ScanMarker } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { FindingView } from "@/lib/report/findings";
import type { SimKey } from "./data";

export type Layer = "markers" | "focus" | "none";

/** Vision modes surfaced on the desktop control rail (all filters the engine supports). */
export const VISION_RAIL: { key: SimKey; short: string; title: string }[] = [
  { key: "normal", short: "Nor", title: "Normal render" },
  { key: "deuteranopia", short: "Deu", title: "Deuteranopia" },
  { key: "protanopia", short: "Pro", title: "Protanopia" },
  { key: "tritanopia", short: "Tri", title: "Tritanopia" },
  { key: "lowvision", short: "Low", title: "Low vision" },
  { key: "grayscale", short: "Gry", title: "Grayscale" },
];

export const LAYER_RAIL: { key: Layer; short: string; title: string }[] = [
  { key: "markers", short: "Mrk", title: "Issue markers" },
  { key: "focus", short: "Foc", title: "Keyboard focus path" },
  { key: "none", short: "Off", title: "No overlay" },
];

/** Short label shown on a selected marker — the measured ratio when we have one, else the criterion. */
export function markerLabel(finding: FindingView): string | undefined {
  if (finding.measurement) {
    return `${finding.measurement.measured.toFixed(1)}:1 · needs ${finding.measurement.required.toFixed(1)}:1`;
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
  occurrence: number; // -1 if not the active occurrence
};

/**
 * Decide each capture marker's visual state from the selection:
 * - no finding selected → every marker idle, none dimmed;
 * - a finding selected → its active occurrence is `selected` (with label), its
 *   sibling occurrences stay idle-and-undimmed, all other markers are dimmed.
 */
export function buildMarkerViews(
  markers: ScanMarker[],
  selected: FindingView | null,
  occurrenceIndex: number,
): MarkerView[] {
  const selectedMarkerNs = new Set((selected?.markers ?? []).map((m) => m.n));
  const activeMarker = selected?.markers[occurrenceIndex];

  return markers.map((marker) => {
    const belongs = selectedMarkerNs.has(marker.n);
    const isActive = activeMarker?.n === marker.n;
    if (!selected) {
      return { marker, state: "idle" as MarkerState, dimmed: false, findingId: null, occurrence: -1 };
    }
    return {
      marker,
      state: isActive ? ("selected" as MarkerState) : ("idle" as MarkerState),
      dimmed: !belongs,
      label: isActive ? markerLabel(selected) : undefined,
      findingId: belongs ? selected.id : null,
      occurrence: belongs ? selected.markers.findIndex((m) => m.n === marker.n) : -1,
    };
  });
}
