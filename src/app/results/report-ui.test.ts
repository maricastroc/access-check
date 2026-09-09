import { describe, expect, it } from "vitest";
import type { ScanOverview, ScanResult } from "@/lib/scan/types";
import { captureById, captureForFinding, focusOnCapture, scrollTargetFor } from "./report-ui";
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
