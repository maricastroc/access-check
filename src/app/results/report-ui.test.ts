import { describe, expect, it } from "vitest";
import type { ScanOverview, ScanResult } from "@/lib/scan/types";
import {
  captureById,
  captureForFinding,
  focusOnCapture,
  focusPathShape,
  inspectionOrigin,
  locatedOnOverview,
  regionOnOverview,
  scrollTargetFor,
  stepFocusStop,
} from "./report-ui";
import { locatedMarkers } from "@/lib/report/findings";

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://example.com",
    title: "Example",
    scannedElements: 10,
    durationMs: 1000,
    screenshot: null,
    score: 90,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 1,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "s",
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

const overview = (over: Partial<ScanOverview> = {}): ScanOverview => ({
  tiles: [
    { image: "data:image/jpeg;base64,a", docY: 0, docHeight: 2000, width: 600, height: 1000 },
    { image: "data:image/jpeg;base64,b", docY: 2000, docHeight: 1400, width: 600, height: 700 },
  ],
  scale: 0.5,
  pageWidth: 1200,
  documentHeight: 3400,
  capturedHeight: 3400,
  complete: true,
  stoppedBy: "complete",
  ...over,
});

describe("which capture the lens shows", () => {
  it("opens a scrollable page column when the scan captured one", () => {
    const capture = captureById(result({ overview: overview() }), "overview");

    expect(capture.tiles).toHaveLength(2);
    expect(capture.width).toBe(1200);
    expect(capture.height).toBe(3400);
    expect(capture.partial).toBe(false);
  });

  it("falls back to the single screenshot of a report saved before page columns existed", () => {
    const capture = captureById(result({ screenshot: "data:image/jpeg;base64,old" }), "overview");

    expect(capture.tiles).toBeUndefined();
    expect(capture.image).toBe("data:image/jpeg;base64,old");
    expect(capture.width).toBe(1200);
    expect(capture.height).toBe(800);
  });

  it("says how far a partial column reached, so the frame can declare it", () => {
    const capture = captureById(
      result({
        overview: overview({
          documentHeight: 40_000,
          capturedHeight: 16_000,
          complete: false,
          stoppedBy: "height",
        }),
      }),
      "overview",
    );

    expect(capture.partial).toBe(true);
    expect(capture.capturedHeight).toBe(16_000);
    expect(capture.documentHeight).toBe(40_000);
    expect(capture.stoppedBy).toBe("height");
  });

  it("prefers a contextual crop when one is asked for by id", () => {
    const capture = captureById(
      result({
        overview: overview(),
        captures: [
          { id: "c1", image: "data:image/jpeg;base64,c", width: 1200, height: 800, docY: 9000 },
        ],
      }),
      "c1",
    );

    expect(capture.id).toBe("c1");
    expect(capture.tiles).toBeUndefined();
    expect(capture.height).toBe(800);
  });
});

describe("scrolling the column to the selected finding", () => {
  it("centres the marker in the visible frame", () => {
    expect(scrollTargetFor(50, 4000, 540)).toBe(2000 - 270);
  });

  it("does not scroll past the top for a finding near the beginning", () => {
    expect(scrollTargetFor(1, 4000, 540)).toBe(0);
  });

  it("does not scroll past the end for a finding near the bottom", () => {
    expect(scrollTargetFor(100, 4000, 540)).toBe(4000 - 540);
  });

  it("stays put when the whole column already fits the frame", () => {
    expect(scrollTargetFor(80, 400, 540)).toBe(0);
  });
});

describe("which image a finding opens", () => {
  const finding = (markers: { n: number; captureId: string; evidence: string }[]) =>
    ({ markers }) as unknown as Parameters<typeof captureForFinding>[0];

  it("opens the sharp crop when the finding has one, not the page column", () => {
    expect(
      captureForFinding(
        finding([
          { n: 1, captureId: "overview", evidence: "captured" },
          { n: 1, captureId: "c2", evidence: "captured" },
        ]),
      ),
    ).toBe("c2");
  });

  it("falls back to the page column when no crop was taken", () => {
    expect(
      captureForFinding(finding([{ n: 1, captureId: "overview", evidence: "captured" }])),
    ).toBe("overview");
  });

  it("keeps the whole page open when the finding is placed on it", () => {
    const placed = {
      markers: [
        { n: 1, captureId: "overview", evidence: "captured", doc: { x: 10, y: 20, w: 30, h: 40 } },
        { n: 1, captureId: "c2", evidence: "captured" },
      ],
    } as unknown as Parameters<typeof captureForFinding>[0];

    expect(locatedOnOverview(placed)).toBe(true);
    expect(captureForFinding(placed)).toBe("overview");
  });

  it("still opens the crop when the page column never placed the finding", () => {
    const unplaced = {
      markers: [
        { n: 1, captureId: "overview", evidence: "unavailable", doc: { x: 1, y: 2, w: 3, h: 4 } },
        { n: 1, captureId: "c2", evidence: "captured" },
      ],
    } as unknown as Parameters<typeof captureForFinding>[0];

    expect(locatedOnOverview(unplaced)).toBe(false);
    expect(captureForFinding(unplaced)).toBe("c2");
  });

  it("ignores a marker whose evidence was dropped", () => {
    expect(
      captureForFinding(
        finding([
          { n: 1, captureId: "c9", evidence: "unavailable" },
          { n: 1, captureId: "overview", evidence: "captured" },
        ]),
      ),
    ).toBe("overview");
  });

  it("counts one problem once, however many captures show it", () => {
    expect(
      locatedMarkers(
        finding([
          { n: 3, captureId: "overview", evidence: "captured" },
          { n: 3, captureId: "c1", evidence: "captured" },
        ]),
      ),
    ).toBe(1);
  });
});

describe("where the focus path is drawn", () => {
  const point = (n: number, docY: number, docX = 600) => ({
    n,
    cx: 50,
    cy: 50,
    visible: true,
    label: `stop ${n}`,
    docX,
    docY,
  });

  const column = captureById(result({ overview: overview({ documentHeight: 3400 }) }), "overview");

  it("places a stop by where it really sits in the page, not by where the browser had scrolled", () => {
    const [placed] = focusOnCapture([point(1, 1700, 600)], column);

    expect(placed.cy).toBeCloseTo(50);
    expect(placed.cx).toBeCloseTo(50);
  });

  it("leaves out a stop the column never reached", () => {
    expect(focusOnCapture([point(1, 9000)], column)).toEqual([]);
  });

  it("shows only the stops inside a contextual crop, in that crop's own frame", () => {
    const crop = captureById(
      result({
        captures: [
          { id: "c1", image: "data:image/jpeg;base64,c", width: 1200, height: 800, docY: 2000 },
        ],
      }),
      "c1",
    );

    const placed = focusOnCapture([point(1, 2400), point(2, 100), point(3, 9000)], crop);

    expect(placed.map((p) => p.n)).toEqual([1]);
    expect(placed[0].cy).toBeCloseTo(50);
  });

  it("leaves a report saved before document coordinates existed exactly as it was", () => {
    const legacy = captureById(result({ screenshot: "data:image/jpeg;base64,old" }), "overview");
    const old = [{ n: 1, cx: 30, cy: 40, visible: true, label: "stop" }];

    expect(focusOnCapture(old, legacy)).toEqual(old);
  });

  it("draws nothing on a page column for a report that has no document coordinates", () => {
    expect(focusOnCapture([{ n: 1, cx: 30, cy: 40, visible: true, label: "s" }], column)).toEqual(
      [],
    );
  });
});

describe("the focus path shape", () => {
  const p = (n: number, cx: number, cy: number, docY: number) => ({
    n,
    cx,
    cy,
    visible: true,
    label: `s${n}`,
    docX: (cx / 100) * 1200,
    docY,
  });

  it("draws a line between stops that sit close together on the page", () => {
    const { segments, breaks } = focusPathShape([p(1, 10, 1, 40), p(2, 40, 1.4, 60)]);

    expect(segments).toEqual([{ x1: 10, y1: 1, x2: 40, y2: 1.4 }]);
    expect(breaks).toEqual([]);
  });

  it("draws no line at all across a jump of thousands of pixels", () => {
    const { segments } = focusPathShape([p(1, 20, 11, 600), p(2, 30, 92, 5100)]);

    expect(segments).toEqual([]);
  });

  it("marks continuity at both ends of a jump, each pointing at the other stop", () => {
    const { breaks } = focusPathShape([p(1, 20, 11, 600), p(2, 30, 92, 5100)]);

    expect(breaks).toEqual([
      { at: 1, to: 2, direction: "down" },
      { at: 2, to: 1, direction: "up" },
    ]);
  });

  it("points continuity upward when the tab order goes back up the page", () => {
    const { breaks } = focusPathShape([p(1, 20, 92, 5100), p(2, 30, 11, 600)]);

    expect(breaks).toEqual([
      { at: 1, to: 2, direction: "up" },
      { at: 2, to: 1, direction: "down" },
    ]);
  });

  it("falls back to distance on the capture when a report has no document coordinates", () => {
    const flat = (n: number, cy: number) => ({ n, cx: 10, cy, visible: true, label: `s${n}` });

    expect(focusPathShape([flat(1, 10), flat(2, 25)]).segments).toHaveLength(1);
    expect(focusPathShape([flat(1, 10), flat(2, 80)]).breaks).toHaveLength(2);
  });

  it("has nothing to draw for a single stop", () => {
    expect(focusPathShape([p(1, 10, 10, 100)])).toEqual({ segments: [], breaks: [] });
  });
});

describe("stepFocusStop", () => {
  const p = (n: number) => ({ n, cx: 10, cy: 10, visible: true, label: `s${n}` });
  const stops = [p(1), p(4), p(9)];

  it("starts at the first stop going forward and the last going back", () => {
    expect(stepFocusStop(stops, null, 1)).toBe(1);
    expect(stepFocusStop(stops, null, -1)).toBe(9);
  });

  it("walks the located stops in order, skipping the ones that never landed", () => {
    expect(stepFocusStop(stops, 1, 1)).toBe(4);
    expect(stepFocusStop(stops, 4, 1)).toBe(9);
    expect(stepFocusStop(stops, 4, -1)).toBe(1);
  });

  it("stops at the ends instead of wrapping around", () => {
    expect(stepFocusStop(stops, 9, 1)).toBeNull();
    expect(stepFocusStop(stops, 1, -1)).toBeNull();
  });

  it("has nowhere to go when no stop landed on the page", () => {
    expect(stepFocusStop([], null, 1)).toBeNull();
  });
});

describe("framing a region for a closer look", () => {
  const page = { width: 1200, height: 16000 };
  const box = { width: 700, height: 260 };

  it("centres the region in the window", () => {
    const origin = inspectionOrigin({ x: 500, y: 5000, w: 100, h: 40 }, box, page);

    expect(origin).toEqual({ x: 200, y: 4890 });
  });

  it("does not scroll past the top or the left of the page", () => {
    expect(inspectionOrigin({ x: 10, y: 20, w: 40, h: 20 }, box, page)).toEqual({ x: 0, y: 0 });
  });

  it("does not scroll past the bottom or the right of the page", () => {
    const origin = inspectionOrigin({ x: 1180, y: 15980, w: 20, h: 20 }, box, page);

    expect(origin).toEqual({ x: 500, y: 15740 });
  });

  it("sits flush when the window is wider than the page", () => {
    const origin = inspectionOrigin(
      { x: 600, y: 300, w: 20, h: 20 },
      { width: 1400, height: 260 },
      page,
    );

    expect(origin.x).toBe(0);
  });

  it("frames a region that straddles the seam between two blocks", () => {
    const origin = inspectionOrigin({ x: 100, y: 1980, w: 200, h: 40 }, box, page);

    expect(origin.y).toBe(1870);
    expect(origin.y).toBeLessThan(2000);
    expect(origin.y + box.height).toBeGreaterThan(2000);
  });

  it("starts at the top of an element taller than the window instead of its middle", () => {
    const origin = inspectionOrigin({ x: 0, y: 8, w: 1200, h: 6633 }, box, page);

    expect(origin.y).toBe(8);
    expect(origin.x).toBe(0);
  });

  it("knows a region below the captured page cannot be framed", () => {
    expect(regionOnOverview({ x: 0, y: 15999, w: 10, h: 10 }, page)).toBe(true);
    expect(regionOnOverview({ x: 0, y: 16000, w: 10, h: 10 }, page)).toBe(false);
    expect(regionOnOverview({ x: 0, y: 100, w: 0, h: 10 }, page)).toBe(false);
  });
});
