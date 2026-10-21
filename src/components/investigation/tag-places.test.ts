import { describe, expect, it } from "vitest";
import type { Rect } from "@/lib/scan/dom/label-spots";
import { aroundOf, OVERHANG, placeTags, type PlacedTag, type TagRequest } from "./tag-places";

const square = (key: string, anchor: Rect, over: Partial<TagRequest> = {}): TagRequest => ({
  key,
  anchor,
  inset: 4,
  w: key.length > 1 ? 28 : 22,
  h: 20,
  shape: "square",
  yields: false,
  ...over,
});

const area = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

const gap = (a: Rect, b: Rect) =>
  Math.hypot(
    Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)),
    Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)),
  );

function associations(requests: TagRequest[], placed: Map<string, PlacedTag>) {
  return requests.flatMap((request) => {
    const tag = placed.get(request.key);
    if (!tag) return [];
    const own = gap(tag.spot, aroundOf(request));
    const others = requests
      .filter((r) => r.key !== request.key)
      .map((r) => gap(tag.spot, aroundOf(r)));
    return [
      {
        key: request.key,
        own,
        nearest: own <= Math.min(Infinity, ...others),
        leader: tag.leader,
        reach: tag.leader
          ? Math.hypot(tag.leader.x2 - tag.leader.x1, tag.leader.y2 - tag.leader.y1)
          : 0,
      },
    ];
  });
}

describe("where a tag goes on a capture", () => {
  it("keeps the usual place, touching its element, when nothing is in the way", () => {
    const placed = placeTags(
      [square("1", { x: 100, y: 100, w: 80, h: 20 })],
      { w: 600, h: 400 },
      {
        texts: [],
        marked: [],
      },
    );
    expect(placed.get("1")).toEqual({ spot: { x: 96, y: 74, w: 22, h: 20 }, leader: null });
  });

  it("steps off the text around its element and stays beside it when it can", () => {
    const heading = { x: 40, y: 60, w: 300, h: 24 };
    const placed = placeTags(
      [square("1", { x: 40, y: 92, w: 200, h: 18 })],
      { w: 600, h: 400 },
      {
        texts: [heading],
        marked: [],
      },
    );
    const tag = placed.get("1")!;
    expect(area(tag.spot, heading)).toBe(0);
    expect(tag.leader).toBeNull();
  });

  it("may still hang over the capture's edge, as far as before", () => {
    const placed = placeTags(
      [square("1", { x: 0, y: 12, w: 60, h: 20 })],
      { w: 600, h: 400 },
      {
        texts: [],
        marked: [],
      },
    );
    const tag = placed.get("1")!.spot;
    expect(tag.x).toBeGreaterThanOrEqual(-OVERHANG);
    expect(tag.y).toBeGreaterThanOrEqual(-OVERHANG);
    expect(tag.y).toBeLessThan(0);
  });

  it("ties a tag that had to move away back to its element with a line", () => {
    const element = { x: 300, y: 200, w: 60, h: 20 };
    const near = [
      { x: 200, y: 170, w: 260, h: 24 },
      { x: 200, y: 226, w: 260, h: 24 },
      { x: 200, y: 196, w: 92, h: 28 },
      { x: 368, y: 196, w: 92, h: 28 },
    ];
    const tag = placeTags(
      [square("1", element)],
      { w: 600, h: 400 },
      { texts: near, marked: [] },
    ).get("1")!;
    expect(near.every((t) => area(tag.spot, t) === 0)).toBe(true);
    expect(tag.leader).not.toBeNull();
    const around = aroundOf({ anchor: element, inset: 4 });
    expect(gap(tag.spot, { x: tag.leader!.x1, y: tag.leader!.y1, w: 0, h: 0 })).toBe(0);
    expect(gap(around, { x: tag.leader!.x2, y: tag.leader!.y2, w: 0, h: 0 })).toBe(0);
  });
});

describe("an element measured without a size", () => {
  it("still steps off the text, and an unmeasured obstacle does not get in the way", () => {
    const point = { x: 108, y: 168, w: Number.NaN, h: Number.NaN };
    const heading = { x: 54, y: 116, w: 358, h: 49 };
    const placed = placeTags(
      [square("3", { ...point, w: 0, h: 0 })],
      { w: 896, h: 896 },
      { texts: [heading], marked: [point] },
    );
    expect(area(placed.get("3")!.spot, heading)).toBe(0);
  });
});

describe("many findings close together, with little room", () => {
  const icons = Array.from({ length: 12 }, (_, i) => ({ x: 20 + i * 28, y: 52, w: 24, h: 24 }));
  const labels = [
    { x: 12, y: 20, w: 340, h: 18 },
    { x: 12, y: 92, w: 340, h: 18 },
  ];
  const requests = icons.map((icon, i) => square(String(i + 1), icon));
  const placed = placeTags(requests, { w: 360, h: 120 }, { texts: labels, marked: icons });
  const tied = associations(requests, placed);

  it("places a tag for every finding in a row of twelve small icons", () => {
    expect(placed.size).toBe(12);
  });

  it("never stacks two tags", () => {
    const spots = [...placed.values()].map((p) => p.spot);
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) expect(area(spots[i], spots[j])).toBe(0);
    }
  });

  it("keeps each tag nearest its own element, or ties it with a line", () => {
    expect(tied.filter((t) => !t.nearest && !t.leader)).toEqual([]);
  });

  it("keeps every tag within reach of its element", () => {
    for (const t of tied) {
      expect(t.own).toBeLessThanOrEqual(t.leader ? 40 : 4);
      expect(t.reach).toBeLessThanOrEqual(40);
    }
  });

  it("keeps every tag inside the capture or the margin it may hang over", () => {
    for (const { spot } of placed.values()) {
      expect(spot.x).toBeGreaterThanOrEqual(-OVERHANG);
      expect(spot.y).toBeGreaterThanOrEqual(-OVERHANG);
      expect(spot.x + spot.w).toBeLessThanOrEqual(360 + OVERHANG);
      expect(spot.y + spot.h).toBeLessThanOrEqual(120 + OVERHANG);
    }
  });
});

describe("no clean place at all", () => {
  const cells = Array.from({ length: 24 }, (_, i) => ({
    x: (i % 6) * 34,
    y: Math.floor(i / 6) * 26,
    w: 30,
    h: 22,
  }));
  const text = [{ x: 0, y: 0, w: 204, h: 104 }];
  const requests = [
    ...cells.slice(0, 8).map((c, i) => square(String(i + 1), c)),
    ...cells.slice(8).map((c, i) => square(`9·${i + 1}`, c, { yields: true, w: 32, h: 17 })),
  ];
  const placed = placeTags(requests, { w: 204, h: 104 }, { texts: text, marked: cells });
  const tied = associations(requests, placed);

  it("still places every tag that must show, and lets the quiet ones give way", () => {
    for (const r of requests.filter((r) => !r.yields)) expect(placed.has(r.key)).toBe(true);
    expect(placed.size).toBeLessThan(requests.length);
  });

  it("keeps each placed tag nearest its own element, or ties it with a line", () => {
    expect(tied.filter((t) => !t.nearest && !t.leader)).toEqual([]);
  });

  it("keeps the overlap between tags small when it cannot be avoided", () => {
    const spots = [...placed.values()].map((p) => p.spot);
    let shared = 0;
    let total = 0;
    for (let i = 0; i < spots.length; i++) {
      total += spots[i].w * spots[i].h;
      for (let j = i + 1; j < spots.length; j++) shared += area(spots[i], spots[j]);
    }
    expect(shared / total).toBeLessThan(0.1);
  });
});
