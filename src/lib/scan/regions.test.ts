import { describe, expect, it } from "vitest";
import type { FocusStop } from "./keyboard";
import type { MarkerTarget } from "./markers";
import {
  findingAnchors,
  planCoverage,
  planRegions,
  REGION_BUDGET,
  stopAnchors,
  withinBudget,
  type Anchor,
  type AnchorRect,
  type Page,
  type RegionBudget,
} from "./regions";

const PAGE: Page = {
  viewport: { width: 1200, height: 800 },
  docHeight: 12_000,
  stickyInset: 0,
};

const ROOMY: RegionBudget = {
  maxMs: 60_000,
  maxBytes: 10_000_000,
  msPerRegion: 330,
  bytesPerRegion: 90_000,
};

function anchor(over: Partial<Anchor> = {}): Anchor {
  return {
    kind: "stop",
    ref: 1,
    selector: "main > button",
    severity: null,
    docX: 100,
    docY: 1_000,
    w: 80,
    h: 40,
    ...over,
  };
}

function rect(over: Partial<AnchorRect> = {}): AnchorRect {
  return { docX: 100, docY: 1_000, w: 80, h: 40, scrolled: false, ...over };
}

function stop(n: number, over: Partial<FocusStop> = {}): FocusStop {
  return {
    n,
    selector: `main > button:nth-of-type(${n})`,
    label: `Stop ${n}`,
    tag: "button",
    focusVisible: true,
    left: 99,
    top: 99,
    width: 99,
    height: 99,
    onScreen: true,
    rect: {
      x: 0,
      y: 0,
      w: 80,
      h: 40,
      docX: 100,
      docY: 1_000,
      flowX: 100,
      flowY: 1_000,
      scrolled: false,
      flowContext: "",
    },
    ...over,
  };
}

const target = (n: number, severity: MarkerTarget["severity"]): MarkerTarget => ({
  selector: `#el-${n}`,
  severity,
  label: `finding ${n}`,
});

describe("what a contextual capture can honestly be asked to hold", () => {
  it("turns a stop below the first screenshot into demand for a region", () => {
    const { anchors, firstCapture, unanchorable } = stopAnchors([stop(9)]);

    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toMatchObject({ kind: "stop", ref: 9, docY: 1_000 });
    expect(firstCapture).toEqual([]);
    expect(unanchorable).toEqual([]);
  });

  it("never spends a capture on a stop inside a scrolling container", () => {
    const inside = stop(9, {
      rect: { ...stop(9).rect!, scrolled: true, flowContext: "#feed" },
    });
    const { anchors, unanchorable } = stopAnchors([inside]);

    expect(anchors).toEqual([]);
    expect(unanchorable).toEqual([{ kind: "stop", ref: 9, reason: "inside-scroller" }]);
  });

  it("asks for no region for what the first screenshot already holds", () => {
    const { anchors, firstCapture } = stopAnchors([
      stop(1, { rect: { ...stop(1).rect!, docY: 240 } }),
    ]);

    expect(anchors).toEqual([]);
    expect(firstCapture).toEqual([{ kind: "stop", ref: 1 }]);
  });

  it("does not take having been visible during the walk as belonging to the first capture", () => {
    const scrolledIntoView = stop(45, {
      onScreen: true,
      left: 10,
      top: 50,
      rect: { ...stop(45).rect!, y: 400, docY: 4_870 },
    });
    const { anchors, firstCapture } = stopAnchors([scrolledIntoView]);

    expect(firstCapture).toEqual([]);
    expect(anchors[0]).toMatchObject({ ref: 45, docY: 4_870 });
  });

  it("records a stop with no measured rectangle instead of dropping it", () => {
    const { unanchorable } = stopAnchors([stop(3, { rect: null })]);
    expect(unanchorable).toEqual([{ kind: "stop", ref: 3, reason: "unplaced" }]);
  });

  it("reads findings by the same rules", () => {
    const { anchors, firstCapture, unanchorable } = findingAnchors(
      [target(1, "critical"), target(2, "serious"), target(3, "minor"), target(4, "moderate")],
      [rect({ docY: 2_000 }), rect({ docY: 300 }), rect({ docY: 2_100, scrolled: true }), null],
    );

    expect(anchors.map((a) => a.ref)).toEqual([1]);
    expect(firstCapture).toEqual([{ kind: "finding", ref: 2 }]);
    expect(unanchorable).toEqual([
      { kind: "finding", ref: 3, reason: "inside-scroller" },
      { kind: "finding", ref: 4, reason: "unplaced" },
    ]);
  });
});

describe("grouping what is near before deciding how much to capture", () => {
  it("holds anchors that share a viewport in one region", () => {
    const regions = planRegions(
      [
        anchor({ ref: 1, docY: 1_000 }),
        anchor({ ref: 2, docY: 1_200 }),
        anchor({ ref: 3, docY: 1_380 }),
      ],
      PAGE,
    );

    expect(regions).toHaveLength(1);
    expect(regions[0].holds.map((h) => h.ref)).toEqual([1, 2, 3]);
  });

  it("opens a second region for an anchor the first cannot reach", () => {
    const regions = planRegions(
      [anchor({ ref: 1, docY: 1_000 }), anchor({ ref: 2, docY: 4_000 })],
      PAGE,
    );

    expect(regions.map((r) => r.holds.map((h) => h.ref))).toEqual([[1], [2]]);
  });

  it("centres the seed anchor, leaving room below a sticky header", () => {
    const [plain] = planRegions([anchor({ docY: 2_000 })], PAGE);
    const [sticky] = planRegions([anchor({ docY: 2_000 })], { ...PAGE, stickyInset: 120 });

    expect(plain.docY).toBe(2_000 - (800 - 40) / 2);
    expect(sticky.docY).toBe(plain.docY - 120);
  });

  it("never scrolls past the anchor while trying to centre it", () => {
    const [region] = planRegions([anchor({ docY: 120 })], PAGE);
    expect(region.docY).toBe(0);
  });

  it("clamps the last region to the end of the document", () => {
    const [region] = planRegions([anchor({ docY: 11_900 })], PAGE);
    expect(region.docY).toBe(12_000 - 800);
  });

  it("takes as many regions as the page needs, with no cap of its own", () => {
    const spread = Array.from({ length: 9 }, (_, i) =>
      anchor({ ref: i + 1, docY: 1_000 * (i + 1) }),
    );
    expect(planRegions(spread, PAGE)).toHaveLength(9);
  });
});

describe("what the budget can pay for", () => {
  const anchors = [
    anchor({ kind: "finding", ref: 1, severity: "minor", docY: 1_000 }),
    anchor({ kind: "finding", ref: 2, severity: "critical", docY: 5_000 }),
    anchor({ kind: "stop", ref: 3, docY: 9_000 }),
  ];
  const regions = planRegions(anchors, PAGE);

  it("pays for the worst finding first, whatever its place on the page", () => {
    const budgeted = withinBudget(regions, anchors, { ...ROOMY, maxMs: 400 });
    const paid = budgeted.filter((r) => !r.missed);

    expect(paid).toHaveLength(1);
    expect(paid[0].holds).toEqual([{ kind: "finding", ref: 2 }]);
  });

  it("keeps a region it could not pay for, and says the clock ran out", () => {
    const budgeted = withinBudget(regions, anchors, { ...ROOMY, maxMs: 400 });
    expect(budgeted.map((r) => r.missed)).toEqual(["time", undefined, "time"]);
  });

  it("says bytes when bytes are what ran out", () => {
    const budgeted = withinBudget(regions, anchors, { ...ROOMY, maxBytes: 100_000 });
    expect(budgeted.filter((r) => r.missed).map((r) => r.missed)).toEqual(["bytes", "bytes"]);
  });

  it("returns regions in document order however it spent the budget", () => {
    const budgeted = withinBudget(regions, anchors, { ...ROOMY, maxMs: 400 });
    expect(budgeted.map((r) => r.docY)).toEqual(
      [...budgeted.map((r) => r.docY)].sort((a, b) => a - b),
    );
  });
});

describe("saying where every element ended up", () => {
  it("puts each anchor in exactly one bucket", () => {
    const stops = [
      stop(1, { rect: { ...stop(1).rect!, docY: 240 } }),
      stop(2, { rect: { ...stop(2).rect!, docY: 3_000 } }),
      stop(3, { rect: { ...stop(3).rect!, scrolled: true, flowContext: "#feed" } }),
      stop(4, { rect: null }),
    ];
    const built = stopAnchors(stops);
    const coverage = planCoverage(built, PAGE, ROOMY);

    const seen = [
      ...coverage.firstCapture.map((a) => a.ref),
      ...coverage.covered.map((a) => a.ref),
      ...coverage.uncovered.map((a) => a.ref),
    ].sort();

    expect(seen).toEqual([1, 2, 3, 4]);
    expect(coverage.firstCapture).toEqual([{ kind: "stop", ref: 1 }]);
    expect(coverage.covered).toEqual([{ kind: "stop", ref: 2, regionId: "r1" }]);
    expect(coverage.uncovered).toEqual([
      { kind: "stop", ref: 3, reason: "inside-scroller" },
      { kind: "stop", ref: 4, reason: "unplaced" },
    ]);
  });

  it("reports an anchor whose region was not paid for, with the reason the region carries", () => {
    const built = stopAnchors([stop(7, { rect: { ...stop(7).rect!, docY: 6_000 } })]);
    const coverage = planCoverage(built, PAGE, { ...ROOMY, maxMs: 0 });

    expect(coverage.covered).toEqual([]);
    expect(coverage.uncovered).toEqual([{ kind: "stop", ref: 7, reason: "time" }]);
    expect(coverage.regions[0].missed).toBe("time");
  });

  it("spends nothing at all when every anchor is inside a scrolling container", () => {
    const built = stopAnchors([
      stop(1, { rect: { ...stop(1).rect!, docY: 3_000, scrolled: true, flowContext: "#a" } }),
      stop(2, { rect: { ...stop(2).rect!, docY: 6_000, scrolled: true, flowContext: "#a" } }),
    ]);
    const coverage = planCoverage(built, PAGE, ROOMY);

    expect(coverage.regions).toEqual([]);
    expect(coverage.uncovered.map((a) => a.reason)).toEqual(["inside-scroller", "inside-scroller"]);
  });
});

describe("centring only when centring is what the region is for", () => {
  it("packs a run of nearby anchors rather than centring the first one", () => {
    const run = [
      anchor({ ref: 1, docY: 2_000 }),
      anchor({ ref: 2, docY: 2_400 }),
      anchor({ ref: 3, docY: 2_700 }),
    ];
    const [region] = planRegions(run, PAGE);

    expect(region.holds).toHaveLength(3);
    expect(region.docY).toBe(2_000);
  });

  it("centres a region that exists to show one element", () => {
    const [region] = planRegions([anchor({ ref: 1, docY: 2_000 })], PAGE);
    expect(region.docY).toBe(2_000 - (800 - 40) / 2);
  });

  it("packing reaches further down the page than centring would", () => {
    const spread = Array.from({ length: 12 }, (_, i) =>
      anchor({ ref: i + 1, docY: 1_000 + i * 240 }),
    );
    expect(planRegions(spread, PAGE).length).toBeLessThan(spread.length);
  });
});

describe("the budget the scan will actually carry", () => {
  it("affords the deepest page we measured", () => {
    const spread = Array.from({ length: 6 }, (_, i) =>
      anchor({ ref: i + 1, docY: 1_500 * (i + 1) }),
    );
    const regions = withinBudget(
      planRegions(spread, { ...PAGE, docHeight: 12_000 }),
      spread,
      REGION_BUDGET,
    );

    expect(regions).toHaveLength(6);
    expect(regions.every((r) => !r.missed)).toBe(true);
  });

  it("stops before it can spend a megabyte on one page", () => {
    const spread = Array.from({ length: 20 }, (_, i) =>
      anchor({ ref: i + 1, docY: 1_500 * (i + 1) }),
    );
    const regions = withinBudget(
      planRegions(spread, { ...PAGE, docHeight: 40_000 }),
      spread,
      REGION_BUDGET,
    );
    const paid = regions.filter((r) => !r.missed);

    expect(paid.length).toBeLessThan(regions.length);
    expect(paid.length * REGION_BUDGET.bytesPerRegion).toBeLessThanOrEqual(REGION_BUDGET.maxBytes);
    expect(
      regions.filter((r) => r.missed).every((r) => r.missed === "time" || r.missed === "bytes"),
    ).toBe(true);
  });
});
