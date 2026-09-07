import { describe, expect, it } from "vitest";
import { buildMarkers, type MarkerTarget } from "./markers";

const target = (label: string): MarkerTarget => ({
  selector: `#${label}`,
  severity: "serious",
  label,
});

const VIEWPORT = { width: 1200, height: 800 };

describe("buildMarkers", () => {
  it("places a rectangle as a percentage of the viewport it was measured in", () => {
    const [marker] = buildMarkers([target("a")], [{ x: 600, y: 400, w: 120, h: 80 }], VIEWPORT);
    expect(marker).toMatchObject({ n: 1, left: 50, top: 50, width: 10, height: 10 });
  });

  it("reads the same rectangle differently in a smaller viewport", () => {
    const [marker] = buildMarkers([target("a")], [{ x: 600, y: 400, w: 120, h: 80 }], {
      width: 600,
      height: 400,
    });
    expect(marker).toMatchObject({ left: 100, top: 100 });
  });

  it("drops what is outside the captured area, empty, or full-page", () => {
    const targets = [
      target("above"),
      target("below"),
      target("right"),
      target("empty"),
      target("overlay"),
    ];
    const markers = buildMarkers(
      targets,
      [
        { x: 10, y: -5, w: 10, h: 10 },
        { x: 10, y: 900, w: 10, h: 10 },
        { x: 1300, y: 10, w: 10, h: 10 },
        { x: 10, y: 10, w: 0, h: 10 },
        { x: 0, y: 0, w: 1200, h: 800 },
      ],
      VIEWPORT,
    );
    expect(markers).toEqual([]);
  });

  it("skips targets whose rectangle could not be measured", () => {
    const markers = buildMarkers(
      [target("gone"), target("here")],
      [null, { x: 0, y: 0, w: 100, h: 100 }],
      VIEWPORT,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].label).toBe("here");
  });

  it("numbers markers in order and stops at the cap", () => {
    const targets = Array.from({ length: 5 }, (_, i) => target(`t${i}`));
    const rects = targets.map((_, i) => ({ x: i * 10, y: 10, w: 20, h: 20 }));
    const markers = buildMarkers(targets, rects, VIEWPORT, 3);
    expect(markers.map((m) => m.n)).toEqual([1, 2, 3]);
    expect(markers.map((m) => m.label)).toEqual(["t0", "t1", "t2"]);
  });
});
