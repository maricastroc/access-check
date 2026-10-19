import { describe, expect, it } from "vitest";
import {
  candidates,
  chooseSpot,
  leaderOf,
  overlap,
  type Rect,
  type SpotRequest,
} from "./label-spots";

const view = { w: 1000, h: 800 };
const size = { w: 20, h: 20 };

function ask(around: Rect, over: Partial<SpotRequest> = {}): SpotRequest {
  return { around, size, shape: "square", view, texts: [], marked: [], taken: [], ...over };
}

describe("choosing where a tag goes", () => {
  it("keeps the usual place when nothing is there", () => {
    const around = { x: 100, y: 100, w: 200, h: 30 };
    expect(chooseSpot(ask(around))).toEqual({ x: 100, y: 78, w: 20, h: 20, far: false });
    expect(chooseSpot(ask(around, { shape: "circle" }))).toEqual({
      x: 80,
      y: 80,
      w: 20,
      h: 20,
      far: false,
    });
  });

  it("leaves the heading above a muted line readable", () => {
    const heading = { x: 28, y: 100, w: 225, h: 23 };
    const muted = { x: 28, y: 136, w: 230, h: 18 };
    const around = { x: 24, y: 129, w: 258, h: 33 };
    const spot = chooseSpot(ask(around, { texts: [heading, muted] }))!;

    expect(overlap(spot, heading)).toBe(0);
    expect(overlap(spot, muted)).toBe(0);
  });

  it("keeps a stop's number off the link beside it in a row of links", () => {
    const links = [
      { x: 180, y: 20, w: 70, h: 20 },
      { x: 268, y: 20, w: 46, h: 20 },
      { x: 332, y: 20, w: 50, h: 20 },
    ];
    for (const link of links.slice(1)) {
      const around = { x: link.x - 2, y: link.y - 2, w: link.w + 4, h: link.h + 4 };
      const spot = chooseSpot(ask(around, { shape: "circle", texts: links }))!;
      expect(links.every((l) => overlap(spot, l) === 0)).toBe(true);
    }
  });

  it("walks away from text in steps, and says when it had to", () => {
    const around = { x: 400, y: 400, w: 60, h: 20 };
    const near = candidates(around, size, "square").filter((c) => !c.far);
    const page = near.map((c) => ({ x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4 }));
    const spot = chooseSpot(ask(around, { texts: page }))!;

    expect(spot.far).toBe(true);
    expect(page.every((t) => overlap(spot, t) === 0)).toBe(true);
  });

  it("prefers a little text over a lot, when every place has some", () => {
    const around = { x: 400, y: 400, w: 60, h: 20 };
    const everywhere = { x: 0, y: 0, w: 1000, h: 800 };
    const heavy = { x: 330, y: 330, w: 200, h: 69 };
    const spot = chooseSpot(ask(around, { texts: [everywhere, heavy] }))!;

    expect(overlap(spot, heavy)).toBe(0);
  });

  it("never puts two tags on top of each other", () => {
    const around = { x: 100, y: 100, w: 200, h: 30 };
    const first = chooseSpot(ask(around))!;
    const second = chooseSpot(ask(around, { taken: [first] }))!;

    expect(overlap(first, second)).toBe(0);
  });

  it("stays inside the window, and gives up when there is no room", () => {
    const top = chooseSpot(ask({ x: 0, y: 0, w: 200, h: 30 }))!;
    expect(top.x).toBeGreaterThanOrEqual(2);
    expect(top.y).toBeGreaterThanOrEqual(2);
    expect(chooseSpot(ask({ x: 0, y: 0, w: 1000, h: 800 }))).toBeNull();
  });

  it("draws the line from the tag's edge to the bracket's edge", () => {
    const around = { x: 100, y: 100, w: 100, h: 40 };
    expect(leaderOf({ x: 230, y: 110, w: 20, h: 20 }, around)).toEqual({
      x1: 230,
      y1: 120,
      x2: 200,
      y2: 120,
    });
    expect(leaderOf({ x: 140, y: 60, w: 20, h: 20 }, around)).toEqual({
      x1: 150,
      y1: 80,
      x2: 150,
      y2: 100,
    });
  });
});
