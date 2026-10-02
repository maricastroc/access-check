import type { FindingView } from "@/lib/report/findings";
import { occurrencesOf, type Occurrence } from "@/lib/report/occurrences";
import { severityLabel } from "@/lib/report/severity";
import type { FocusStop } from "@/lib/scan/keyboard";
import { captureOf, stopPlacement, type StopPlacement } from "@/lib/scan/placement";
import { VIEWPORT_CAPTURE, type ScanRegion } from "@/lib/scan/types";
import { sevOf, type Box, type PlacedMark, type PlacedStop } from "@/components/investigation";
import type { Translate } from "@/lib/i18n/t";

export type Layer = "findings" | "path" | "none";

export type StopView = PlacedStop & { current: boolean };

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
      box: {
        left: placement.left,
        top: placement.top,
        width: placement.width,
        height: placement.height,
      },
      label: stop.label,
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

export type Place = { captureId: string; box: Box };

export function occurrencePlaces(
  occ: Occurrence,
  stops: FocusStop[],
  regions: ScanRegion[],
): Place[] {
  if (occ.keyboard && occ.stop !== null) {
    const placement = stopPlacement(
      stops.find((s) => s.n === occ.stop),
      undefined,
      regions,
    );
    if (placement.kind !== "placed") return [];
    const { captureId, left, top, width, height } = placement;
    return [{ captureId, box: { left, top, width, height } }];
  }
  return occ.markers.map((m) => ({
    captureId: captureOf(m),
    box: { left: m.left, top: m.top, width: m.width, height: m.height },
  }));
}

export function captureOfOccurrence(
  occ: Occurrence | null,
  stops: FocusStop[],
  regions: ScanRegion[],
): string | null {
  return occ ? (occurrencePlaces(occ, stops, regions)[0]?.captureId ?? null) : null;
}

export function marksOnCapture(
  findings: FindingView[],
  captureId: string,
  stops: FocusStop[],
  regions: ScanRegion[],
  t: Translate,
): PlacedMark[] {
  const marks: PlacedMark[] = [];
  for (const f of findings) {
    const occurrences = occurrencesOf(f);
    const kind = f.passLabel ?? (f.severity ? severityLabel(f.severity, t) : "");
    occurrences.forEach((occ) => {
      const place = occurrencePlaces(occ, stops, regions).find((p) => p.captureId === captureId);
      if (!place) return;
      marks.push({
        findingId: f.id,
        n: f.n,
        sev: sevOf(f),
        index: occ.index,
        total: occurrences.length,
        title: f.title,
        kind,
        box: place.box,
      });
    });
  }
  return marks;
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
