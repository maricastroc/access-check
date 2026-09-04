import type { ScanMarker } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { FindingView } from "@/lib/report/findings";
import type { SimKey } from "./data";

export type Layer = "markers" | "focus" | "none";

/** Vision modes surfaced on the desktop control rail (all filters the engine supports). */
export const VISION_RAIL: { key: SimKey; short: string; title: string }[] = [
  { key: "normal", short: "Nor", title: "Normal, no vision filter" },
  { key: "deuteranopia", short: "Deu", title: "Deuteranopia (red-green color blindness)" },
  { key: "protanopia", short: "Pro", title: "Protanopia (red-green color blindness)" },
  { key: "tritanopia", short: "Tri", title: "Tritanopia (blue-yellow color blindness)" },
  { key: "lowvision", short: "Low", title: "Low vision (reduced sharpness and contrast)" },
  { key: "grayscale", short: "Gry", title: "Grayscale (no color)" },
];

export const LAYER_RAIL: { key: Layer; short: string; title: string }[] = [
  { key: "markers", short: "Mrk", title: "Show issue markers" },
  { key: "focus", short: "Foc", title: "Show the keyboard focus order" },
  { key: "none", short: "Off", title: "Hide the overlay" },
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
};

/**
 * Decide each capture marker's visual state from the selection. The engine emits
 * at most one marker per finding, so there is no occurrence index:
 * - no finding selected → every marker idle, none dimmed;
 * - a finding selected → its marker is `selected` (with the measured label), all
 *   other findings' markers are dimmed.
 */
export function buildMarkerViews(markers: ScanMarker[], selected: FindingView | null): MarkerView[] {
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
      label: belongs ? markerLabel(selected) : undefined,
      findingId: belongs ? selected.id : null,
    };
  });
}
