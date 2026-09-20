import { describe, expect, it } from "vitest";
import { buildMarkers, markerTargets, MAX_MARKERS, type MarkerTarget } from "./markers";
import type { DomRect } from "./dom/rects";
import { VIEWPORT_CAPTURE } from "./types";

const VIEWPORT = { width: 1200, height: 800 };

const target = (n: number): MarkerTarget => ({
  selector: `#el-${n}`,
  severity: "serious",
  label: `finding ${n}`,
});

const rect = (over: Partial<DomRect> = {}): DomRect => ({
  x: 100,
  y: 200,
  w: 80,
  h: 40,
  docX: 100,
  docY: 200,
  scrolled: false,
  ...over,
});

describe("markers on the screenshot", () => {
  it("places a rectangle as a percentage of the viewport", () => {
    const [marker] = buildMarkers([target(1)], [rect()], VIEWPORT);

    expect(marker.left).toBeCloseTo((100 / 1200) * 100, 4);
    expect(marker.top).toBeCloseTo((200 / 800) * 100, 4);
    expect(marker.width).toBeCloseTo((80 / 1200) * 100, 4);
    expect(marker.height).toBeCloseTo((40 / 800) * 100, 4);
  });

  it("numbers what it placed, in order, with no gaps", () => {
    const markers = buildMarkers(
      [target(1), target(2), target(3)],
      [rect(), null, rect({ y: 400 })],
      VIEWPORT,
    );

    expect(markers.map((m) => m.n)).toEqual([1, 2]);
    expect(markers.map((m) => m.label)).toEqual(["finding 1", "finding 3"]);
  });

  it("skips an element with no box", () => {
    expect(buildMarkers([target(1)], [rect({ w: 0, h: 0 })], VIEWPORT)).toEqual([]);
  });

  it("skips an element the walk could not measure", () => {
    expect(buildMarkers([target(1)], [null], VIEWPORT)).toEqual([]);
  });

  it("skips an element outside the captured viewport", () => {
    expect(buildMarkers([target(1)], [rect({ y: 2000 })], VIEWPORT)).toEqual([]);
    expect(buildMarkers([target(1)], [rect({ y: -10 })], VIEWPORT)).toEqual([]);
  });

  it("does not mark a box that covers the whole page", () => {
    expect(buildMarkers([target(1)], [rect({ x: 0, y: 0, w: 1200, h: 800 })], VIEWPORT)).toEqual(
      [],
    );
  });

  it("clamps a box that runs past the bottom edge", () => {
    const [marker] = buildMarkers([target(1)], [rect({ y: 780, h: 200 })], VIEWPORT);
    expect(marker.top + marker.height).toBeLessThanOrEqual(100);
  });

  it("stops at the marker cap so the capture stays readable", () => {
    const targets = Array.from({ length: MAX_MARKERS + 4 }, (_, i) => target(i));
    const rects = targets.map((_, i) => rect({ y: 100 + i * 20 }));

    expect(buildMarkers(targets, rects, VIEWPORT)).toHaveLength(MAX_MARKERS);
  });
});

describe("which elements get a marker", () => {
  it("takes the first node of each violation", () => {
    const targets = markerTargets([
      {
        id: "color-contrast",
        impact: "serious",
        help: "Contrast",
        description: "d",
        tags: [],
        nodes: [{ target: [".a"] }, { target: [".b"] }],
      },
    ]);

    expect(targets).toEqual([{ selector: ".a", severity: "serious", label: "Contrast" }]);
  });

  it("falls back to minor when axe states no impact", () => {
    const [only] = markerTargets([
      {
        id: "x",
        impact: null,
        help: "H",
        description: "d",
        tags: [],
        nodes: [{ target: [".a"] }],
      },
    ]);

    expect(only.severity).toBe("minor");
  });

  it("ignores a violation with no usable selector", () => {
    expect(
      markerTargets([
        { id: "x", impact: "serious", help: "H", description: "d", tags: [], nodes: [] },
      ]),
    ).toEqual([]);
  });
});

describe("which capture a marker was measured in", () => {
  it("tags every marker with the capture it came from", () => {
    const markers = buildMarkers([target(1), target(2)], [rect(), rect({ y: 400 })], VIEWPORT);

    expect(markers).toHaveLength(2);
    for (const marker of markers) expect(marker.captureId).toBe(VIEWPORT_CAPTURE);
  });

  it("names the first screenshot, not an invented capture", () => {
    expect(VIEWPORT_CAPTURE).toBe("viewport");
  });
});
