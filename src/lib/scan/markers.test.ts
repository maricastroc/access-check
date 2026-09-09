import { describe, expect, it } from "vitest";
import {
  buildMarkers,
  centeredMargin,
  landsOnOverview,
  numberTargets,
  overviewMarkers,
  fitsViewport,
  markerFromCrop,
  MAX_MARKERS,
  orderByDocument,
  unavailableMarker,
  CAPTURE_EDGE_PADDING,
  type MarkerTarget,
} from "./markers";
import type { DocRect } from "./dom/rects";

const VIEWPORT = { width: 1200, height: 800 };

const target = (label: string): MarkerTarget => ({
  selector: `#${label}`,
  severity: "serious",
  label,
});

const doc = (over: Partial<DocRect> = {}): DocRect => ({
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  docX: 0,
  docY: 0,
  pinned: false,
  ...over,
});

const PAGE = { width: 1200, height: 16_000 };

describe("overview markers", () => {
  it("keeps what the overview screenshot actually shows", () => {
    const markers = buildMarkers(
      [target("a"), target("b")],
      [
        { x: 10, y: 20, w: 100, h: 40 },
        { x: 10, y: 5000, w: 100, h: 40 },
      ],
      VIEWPORT,
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].label).toBe("a");
    expect(markers[0].captureId).toBe("overview");
    expect(markers[0].evidence).toBe("captured");
  });
});

describe("work ordering", () => {
  it("orders the work down the document, so one pass can group neighbours", () => {
    const rects = [doc({ docY: 900 }), doc({ docY: 300 }), doc({ docY: 600 })];

    expect(orderByDocument([0, 1, 2], rects)).toEqual([1, 2, 0]);
  });
});

describe("what fits a crop", () => {
  it("takes an element sitting comfortably inside the viewport", () => {
    expect(fitsViewport({ x: 10, y: 200, w: 100, h: 40 }, VIEWPORT)).toBe(true);
  });

  it("refuses one glued to the top edge, where a sticky header may cover it", () => {
    expect(fitsViewport({ x: 10, y: CAPTURE_EDGE_PADDING - 1, w: 100, h: 40 }, VIEWPORT)).toBe(
      false,
    );
  });

  it("refuses one running past the bottom edge", () => {
    expect(fitsViewport({ x: 10, y: 780, w: 100, h: 40 }, VIEWPORT)).toBe(false);
  });

  it("takes one resting on the very bottom when the page cannot scroll any further", () => {
    const footerLink = { x: 10, y: 776, w: 48, h: 24 };

    expect(fitsViewport(footerLink, VIEWPORT)).toBe(false);
    expect(fitsViewport(footerLink, VIEWPORT, true)).toBe(true);
  });

  it("still refuses one running off the bottom, even at the end of the page", () => {
    expect(fitsViewport({ x: 10, y: 790, w: 48, h: 24 }, VIEWPORT, true)).toBe(false);
  });

  it("refuses an element with no box at all", () => {
    expect(fitsViewport({ x: 10, y: 200, w: 0, h: 0 }, VIEWPORT)).toBe(false);
  });
});

describe("markers placed on a crop", () => {
  it("stores coordinates relative to that crop, not to the document", () => {
    const marker = markerFromCrop(
      target("a"),
      { x: 600, y: 400, w: 120, h: 80 },
      VIEWPORT,
      3,
      "c1",
      "captured",
    );

    expect(marker.captureId).toBe("c1");
    expect(marker.left).toBeCloseTo(50);
    expect(marker.top).toBeCloseTo(50);
    expect(marker.width).toBeCloseTo(10);
    expect(marker.height).toBeCloseTo(10);
  });

  it("marks a passenger of someone else's crop as shared", () => {
    const marker = markerFromCrop(
      target("b"),
      { x: 0, y: 100, w: 50, h: 50 },
      VIEWPORT,
      4,
      "c1",
      "shared",
    );
    expect(marker.evidence).toBe("shared");
  });

  it("clamps an element taller than the crop instead of overflowing it", () => {
    const marker = markerFromCrop(
      target("tall"),
      { x: 0, y: 600, w: 100, h: 4000 },
      VIEWPORT,
      5,
      "c2",
      "captured",
    );

    expect(marker.top + marker.height).toBeLessThanOrEqual(100.01);
  });
});

describe("degradation", () => {
  it("still reports an element no crop could reach", () => {
    const marker = unavailableMarker(target("gone"), 9);

    expect(marker.evidence).toBe("unavailable");
    expect(marker.width).toBe(0);
    expect(marker.height).toBe(0);
  });
});

describe("markers on the scrollable overview", () => {
  it("keeps a finding above the fold and one far below it", () => {
    const markers = overviewMarkers(
      [target("hero"), target("footer")],
      [
        doc({ docX: 100, docY: 200, w: 300, h: 60 }),
        doc({ docX: 100, docY: 12_400, w: 300, h: 60 }),
      ],
      PAGE,
    );

    expect(markers.map((m) => m.label)).toEqual(["hero", "footer"]);
    expect(markers.every((m) => m.evidence === "captured")).toBe(true);
  });

  it("positions a marker against the whole column, not against the first screen", () => {
    const [marker] = overviewMarkers(
      [target("mid")],
      [doc({ docX: 600, docY: 8_000, w: 120, h: 160 })],
      PAGE,
    );

    expect(marker.top).toBeCloseTo(50);
    expect(marker.left).toBeCloseTo(50);
    expect(marker.height).toBeCloseTo(1);
    expect(marker.doc).toEqual({ x: 600, y: 8_000, w: 120, h: 160 });
  });

  it("carries global document coordinates next to the coordinates inside the column", () => {
    const [marker] = overviewMarkers(
      [target("a")],
      [doc({ docX: 24, docY: 4_000, w: 400, h: 100 })],
      { width: 1200, height: 8_000 },
    );

    expect(marker.doc).toEqual({ x: 24, y: 4_000, w: 400, h: 100 });
    expect(marker.top).toBeCloseTo(50);
    expect(marker.captureId).toBe("overview");
  });

  it("clamps a section that runs past the end of what was captured", () => {
    const [marker] = overviewMarkers(
      [target("tall")],
      [doc({ docY: 15_800, w: 1200, h: 4_000 })],
      PAGE,
    );

    expect(marker.top + marker.height).toBeLessThanOrEqual(100.01);
    expect(marker.doc?.h).toBe(4_000);
  });

  it("places an element under a sticky header, which still sits in the page flow", () => {
    expect(landsOnOverview(doc({ docY: 60, w: 900, h: 48 }), 16_000)).toBe(true);
  });

  it("refuses a fixed element, which no page-flow image can show in place", () => {
    expect(landsOnOverview(doc({ docY: 12, w: 200, h: 40, pinned: true }), 16_000)).toBe(false);
  });
});

describe("numbering shared by the column and the crops", () => {
  it("gives every drawable target one number, in document order", () => {
    const targets = [target("a"), target("b"), target("c")];
    const rects = [doc({ docY: 100 }), null, doc({ docY: 900 })];

    expect(numberTargets(targets, rects)).toEqual([0, 2]);
  });

  it("stops at the marker budget", () => {
    const many = Array.from({ length: MAX_MARKERS + 3 }, (_, i) => target(`t${i}`));
    const rects = many.map((_, i) => doc({ docY: i * 100 }));

    expect(numberTargets(many, rects)).toHaveLength(MAX_MARKERS);
  });

  it("keeps a target's number the same on the column and on its crop", () => {
    const targets = [target("a"), target("b"), target("c")];
    const rects = [
      doc({ docY: 100, w: 10, h: 10, pinned: true }),
      doc({ docY: 900, w: 10, h: 10 }),
      doc({ docY: 4000, w: 10, h: 10 }),
    ];
    const numbered = numberTargets(targets, rects);

    const column = overviewMarkers(targets, rects, PAGE, numbered);
    const crop = markerFromCrop(
      targets[2],
      { x: 0, y: 100, w: 10, h: 10 },
      VIEWPORT,
      numbered.indexOf(2) + 1,
      "c1",
      "captured",
    );

    expect(numbered).toEqual([0, 1, 2]);
    expect(column.map((m) => m.n)).toEqual([2, 3]);
    expect(crop.n).toBe(3);
  });

  it("leaves a pinned element off the column but still numbered", () => {
    const targets = [target("banner"), target("body")];
    const rects = [
      doc({ docY: 10, w: 300, h: 40, pinned: true }),
      doc({ docY: 900, w: 300, h: 40 }),
    ];
    const numbered = numberTargets(targets, rects);

    expect(numbered).toEqual([0, 1]);
    expect(overviewMarkers(targets, rects, PAGE, numbered).map((m) => m.n)).toEqual([2]);
  });

  it("says nothing landed when there is no captured column at all", () => {
    expect(overviewMarkers([target("a")], [doc({ docY: 10 })], { width: 1200, height: 0 })).toEqual(
      [],
    );
  });
});

describe("where a crop is anchored", () => {
  it("centres a small element in the viewport", () => {
    expect(centeredMargin(40, VIEWPORT, 0)).toBe(380);
  });

  it("clears a sticky header rather than hiding behind it", () => {
    expect(centeredMargin(700, VIEWPORT, 120)).toBe(152);
  });

  it("never asks for a margin taller than the viewport", () => {
    expect(centeredMargin(4000, VIEWPORT, 0)).toBeLessThanOrEqual(VIEWPORT.height);
  });
});
