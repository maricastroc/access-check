import type { ScanMarker } from "@/lib/scan/types";
import type { MarkerState } from "@/components/ui";
import type { FindingView } from "@/lib/report/findings";
import type { SimKey } from "./data";

export type Layer = "markers" | "focus" | "none";

export const VISION_RAIL: { key: SimKey; label: string; title: string }[] = [
  { key: "normal", label: "Normal", title: "Normal, no vision filter" },
  { key: "deuteranopia", label: "Deuteranopia", title: "Deuteranopia (red-green color blindness)" },
  { key: "protanopia", label: "Protanopia", title: "Protanopia (red-green color blindness)" },
  { key: "tritanopia", label: "Tritanopia", title: "Tritanopia (blue-yellow color blindness)" },
  { key: "lowvision", label: "Low vision", title: "Low vision (reduced sharpness and contrast)" },
  { key: "grayscale", label: "Grayscale", title: "Grayscale (no color)" },
];

export const LAYER_RAIL: { key: Layer; label: string; title: string }[] = [
  { key: "markers", label: "Issue markers", title: "Show the issue markers on the screenshot" },
  { key: "focus", label: "Focus path", title: "Show the keyboard focus order" },
  { key: "none", label: "No overlay", title: "Hide the overlay" },
];

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

export function buildMarkerViews(
  markers: ScanMarker[],
  selected: FindingView | null,
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
      label: belongs ? markerLabel(selected) : undefined,
      findingId: belongs ? selected.id : null,
    };
  });
}
