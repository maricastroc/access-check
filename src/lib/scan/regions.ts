import type { FocusStop } from "./keyboard";
import type { MarkerTarget } from "./markers";
import { stopPlacement } from "./placement";
import { SCAN_VIEWPORT, type RegionMiss, type Severity } from "./types";

export type AnchorKind = "finding" | "stop";

export type AnchorRect = {
  docX: number;
  docY: number;
  w: number;
  h: number;
  scrolled: boolean;
};

export type Anchor = {
  kind: AnchorKind;
  ref: number;
  selector: string;
  severity: Severity | null;
  docX: number;
  docY: number;
  w: number;
  h: number;
};

export type UnanchorableReason = "inside-scroller" | "unplaced";

export type AnchorRef = { kind: AnchorKind; ref: number };

export type PlannedRegion = {
  id: string;
  docY: number;
  width: number;
  height: number;
  holds: AnchorRef[];
};

export type BudgetedRegion = PlannedRegion & { missed?: RegionMiss };

export type RegionBudget = {
  maxMs: number;
  maxBytes: number;
  msPerRegion: number;
  bytesPerRegion: number;
};

export type Coverage = {
  regions: BudgetedRegion[];
  firstCapture: AnchorRef[];
  covered: (AnchorRef & { regionId: string })[];
  uncovered: (AnchorRef & { reason: UnanchorableReason | RegionMiss })[];
};

export type Page = {
  viewport: { width: number; height: number };
  docHeight: number;
  stickyInset: number;
};

export const REGION_BUDGET: RegionBudget = {
  maxMs: 5_000,
  maxBytes: 800_000,
  msPerRegion: 300,
  bytesPerRegion: 110_000,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

export function stopAnchors(stops: FocusStop[], viewport = SCAN_VIEWPORT) {
  const anchors: Anchor[] = [];
  const firstCapture: AnchorRef[] = [];
  const unanchorable: (AnchorRef & { reason: UnanchorableReason })[] = [];

  for (const stop of stops) {
    const where = stopPlacement(stop, viewport);
    const ref: AnchorRef = { kind: "stop", ref: stop.n };

    if (where.kind === "placed") {
      firstCapture.push(ref);
      continue;
    }
    if (where.kind === "inside-scroller") {
      unanchorable.push({ ...ref, reason: "inside-scroller" });
      continue;
    }
    if (where.kind === "unplaced") {
      unanchorable.push({ ...ref, reason: "unplaced" });
      continue;
    }

    const rect = stop.rect!;
    anchors.push({
      kind: "stop",
      ref: stop.n,
      selector: stop.selector,
      severity: null,
      docX: rect.docX ?? 0,
      docY: rect.docY!,
      w: rect.w,
      h: rect.h,
    });
  }

  return { anchors, firstCapture, unanchorable };
}

export function findingAnchors(
  targets: MarkerTarget[],
  rects: (AnchorRect | null)[],
  viewport = SCAN_VIEWPORT,
) {
  const anchors: Anchor[] = [];
  const firstCapture: AnchorRef[] = [];
  const unanchorable: (AnchorRef & { reason: UnanchorableReason })[] = [];

  targets.forEach((target, i) => {
    const rect = rects[i];
    const ref: AnchorRef = { kind: "finding", ref: i + 1 };

    if (!rect || rect.w === 0 || rect.h === 0) {
      unanchorable.push({ ...ref, reason: "unplaced" });
      return;
    }
    if (rect.scrolled) {
      unanchorable.push({ ...ref, reason: "inside-scroller" });
      return;
    }
    if (rect.docY >= 0 && rect.docY <= viewport.height && rect.docX <= viewport.width) {
      firstCapture.push(ref);
      return;
    }

    anchors.push({
      kind: "finding",
      ref: i + 1,
      selector: target.selector,
      severity: target.severity,
      docX: rect.docX,
      docY: rect.docY,
      w: rect.w,
      h: rect.h,
    });
  });

  return { anchors, firstCapture, unanchorable };
}

function roomOf(page: Page): number {
  return Math.max(0, page.docHeight - page.viewport.height);
}

function packedTop(anchor: Anchor, page: Page): number {
  return Math.round(Math.max(0, Math.min(anchor.docY - page.stickyInset, roomOf(page))));
}

function centredTop(anchor: Anchor, page: Page): number {
  const centred =
    anchor.docY - (page.viewport.height - Math.min(anchor.h, page.viewport.height)) / 2;
  const belowSticky = centred - page.stickyInset;
  return Math.round(Math.max(0, Math.min(belowSticky, anchor.docY, roomOf(page))));
}

export function planRegions(anchors: Anchor[], page: Page): PlannedRegion[] {
  const queue = [...anchors].sort((a, b) => a.docY - b.docY || a.docX - b.docX);
  const regions: PlannedRegion[] = [];

  let i = 0;
  while (i < queue.length) {
    const seed = queue[i];
    const packed = packedTop(seed, page);
    const bottom = packed + page.viewport.height;
    const holds: AnchorRef[] = [{ kind: seed.kind, ref: seed.ref }];
    i += 1;

    while (i < queue.length) {
      const next = queue[i];
      if (next.docY < packed || next.docY + next.h > bottom) break;
      holds.push({ kind: next.kind, ref: next.ref });
      i += 1;
    }

    regions.push({
      id: `r${regions.length + 1}`,
      docY: holds.length === 1 ? centredTop(seed, page) : packed,
      width: page.viewport.width,
      height: page.viewport.height,
      holds,
    });
  }

  return regions;
}

export function regionValue(region: PlannedRegion, anchors: Anchor[]): number {
  const held = new Set(region.holds.map((h) => `${h.kind}:${h.ref}`));
  let weight = 0;
  for (const anchor of anchors) {
    if (!held.has(`${anchor.kind}:${anchor.ref}`)) continue;
    if (anchor.severity) weight = Math.max(weight, SEVERITY_WEIGHT[anchor.severity]);
  }
  return weight;
}

export function withinBudget(
  regions: PlannedRegion[],
  anchors: Anchor[],
  budget: RegionBudget,
): BudgetedRegion[] {
  const byPriority = [...regions].sort((a, b) => {
    const value = regionValue(b, anchors) - regionValue(a, anchors);
    if (value !== 0) return value;
    return a.docY - b.docY;
  });

  const verdict = new Map<string, RegionMiss | undefined>();
  let ms = 0;
  let bytes = 0;
  let spent: RegionMiss | null = null;

  for (const region of byPriority) {
    const stoppedBy: RegionMiss | null =
      spent ??
      (bytes + budget.bytesPerRegion > budget.maxBytes
        ? "bytes"
        : ms + budget.msPerRegion > budget.maxMs
          ? "time"
          : null);

    if (stoppedBy) {
      spent = stoppedBy;
      verdict.set(region.id, stoppedBy);
      continue;
    }

    ms += budget.msPerRegion;
    bytes += budget.bytesPerRegion;
    verdict.set(region.id, undefined);
  }

  return regions.map((region) => {
    const missed = verdict.get(region.id);
    return missed ? { ...region, missed } : region;
  });
}

export function planCoverage(
  input: {
    anchors: Anchor[];
    firstCapture: AnchorRef[];
    unanchorable: (AnchorRef & { reason: UnanchorableReason })[];
  },
  page: Page,
  budget: RegionBudget,
): Coverage {
  const regions = withinBudget(planRegions(input.anchors, page), input.anchors, budget);

  const covered: (AnchorRef & { regionId: string })[] = [];
  const uncovered: (AnchorRef & { reason: UnanchorableReason | RegionMiss })[] = [
    ...input.unanchorable,
  ];

  for (const region of regions) {
    for (const held of region.holds) {
      if (region.missed) uncovered.push({ ...held, reason: region.missed });
      else covered.push({ ...held, regionId: region.id });
    }
  }

  return { regions, firstCapture: input.firstCapture, covered, uncovered };
}
