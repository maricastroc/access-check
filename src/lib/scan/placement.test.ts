import { describe, expect, it } from "vitest";
import type { FocusStop } from "./keyboard";
import { VIEWPORT_CAPTURE, type ScanRegion } from "./types";
import { captureOf, readableContext, stopPlacement } from "./placement";

function stop(over: Partial<FocusStop> = {}): FocusStop {
  return {
    n: 7,
    selector: "main > button",
    label: "Send",
    tag: "button",
    focusVisible: true,
    left: 99,
    top: 99,
    width: 99,
    height: 99,
    onScreen: true,
    rect: {
      x: 144,
      y: 240,
      w: 96,
      h: 40,
      docX: 144,
      docY: 240,
      flowX: 144,
      flowY: 240,
      scrolled: false,
      flowContext: "",
    },
    ...over,
  };
}

describe("where a focus stop can honestly be drawn", () => {
  it("places a stop from its document position, not from where the walk happened to be", () => {
    const where = stopPlacement(stop());
    expect(where).toEqual({
      kind: "placed",
      captureId: VIEWPORT_CAPTURE,
      left: 12,
      top: 30,
      width: 8,
      height: 5,
    });
  });

  it("ignores the viewport rectangle the walk recorded after scrolling", () => {
    const scrolledIntoView = stop({
      left: 10,
      top: 50,
      onScreen: true,
      rect: { ...stop().rect!, y: 400, docY: 4870 },
    });

    expect(stopPlacement(scrolledIntoView)).toEqual({ kind: "outside", docY: 4870 });
  });

  it("refuses to draw a stop that lives inside a scrolling area, even when it was on screen", () => {
    const where = stopPlacement(
      stop({ rect: { ...stop().rect!, scrolled: true, flowContext: "#feed" } }),
    );
    expect(where).toEqual({ kind: "inside-scroller", context: "#feed" });
  });

  it("says how far down the page a stop sits when it is outside the screenshot", () => {
    const where = stopPlacement(
      stop({
        onScreen: false,
        left: null,
        top: null,
        rect: { ...stop().rect!, docY: 4870.4 },
      }),
    );
    expect(where).toEqual({ kind: "outside", docY: 4870 });
  });

  it("clips a stop that starts inside the screenshot and runs past its bottom", () => {
    const where = stopPlacement(stop({ rect: { ...stop().rect!, docY: 780, h: 200 } }));
    expect(where).toMatchObject({ kind: "placed", top: 97.5 });
    if (where.kind === "placed") expect(where.top + where.height).toBeLessThanOrEqual(100);
  });

  it("admits it cannot place a stop with no measured rectangle", () => {
    expect(stopPlacement(stop({ onScreen: false, left: null, top: null, rect: null }))).toEqual({
      kind: "unplaced",
    });
    expect(stopPlacement(undefined)).toEqual({ kind: "unplaced" });
  });
});

describe("which capture a marker belongs to", () => {
  it("reads the capture a marker was measured in", () => {
    expect(captureOf({ captureId: "r2" })).toBe("r2");
  });

  it("treats a marker from a scan taken before captures existed as the first screenshot", () => {
    expect(captureOf({ captureId: undefined })).toBe(VIEWPORT_CAPTURE);
  });
});

describe("naming the scrolling area a stop lives in", () => {
  it("keeps a reference a person can use", () => {
    expect(readableContext("#feed")).toBe("#feed");
    expect(readableContext(".sandbox")).toBe(".sandbox");
  });

  it("drops a path, because a path is not a reference", () => {
    expect(readableContext("div > div:nth-of-type(2) > div:nth-of-type(1) > div")).toBeNull();
    expect(readableContext("")).toBeNull();
  });
});

describe("finding a stop in a contextual capture", () => {
  const region = (over: Partial<ScanRegion> = {}): ScanRegion => ({
    id: "r1",
    docY: 4_600,
    width: 1200,
    height: 800,
    image: "data:image/jpeg;base64,x",
    stops: [{ n: 45, left: 10, top: 40, width: 6, height: 4 }],
    ...over,
  });

  const below = stop({
    onScreen: false,
    left: null,
    top: null,
    rect: { ...stop().rect!, docY: 4_870 },
    n: 45,
  });

  it("points at the capture where the stop was re-measured", () => {
    expect(stopPlacement(below, undefined, [region()])).toEqual({
      kind: "placed",
      captureId: "r1",
      left: 10,
      top: 40,
      width: 6,
      height: 4,
    });
  });

  it("says the region was not captured rather than falling back to the first screenshot", () => {
    const missed = region({ image: null, missed: "bytes", stops: [] });
    expect(stopPlacement(below, undefined, [missed])).toEqual({
      kind: "region-missed",
      captureId: "r1",
      docY: 4_870,
      reason: "bytes",
    });
  });

  it("stays outside when the element was not where the plan expected it", () => {
    const elsewhere = region({ stops: [{ n: 2, left: 1, top: 1, width: 1, height: 1 }] });
    expect(stopPlacement(below, undefined, [elsewhere])).toEqual({ kind: "outside", docY: 4_870 });
  });

  it("keeps a stop inside a scrolling container out of every capture", () => {
    const inside = stop({
      n: 45,
      rect: { ...stop().rect!, docY: 4_870, scrolled: true, flowContext: "#feed" },
    });
    expect(stopPlacement(inside, undefined, [region()])).toEqual({
      kind: "inside-scroller",
      context: "#feed",
    });
  });
});
