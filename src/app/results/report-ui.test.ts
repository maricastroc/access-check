import { describe, expect, it } from "vitest";
import type { FindingView } from "@/lib/report/findings";
import type { FocusStop } from "@/lib/scan/keyboard";
import type { ScanMarker } from "@/lib/scan/types";
import {
  buildStopViews,
  captureOfOccurrence,
  marksOnCapture,
  occurrencePlaces,
  selectedStopPlacement,
  stepFocusStop,
} from "./report-ui";
import { occurrencesOf } from "@/lib/report/occurrences";
import { translator } from "@/lib/i18n/t";

const t = translator();

function marker(n: number, over: Partial<ScanMarker> = {}): ScanMarker {
  return {
    n,
    severity: "serious",
    label: `finding ${n}`,
    left: 10,
    top: 10,
    width: 5,
    height: 5,
    ...over,
  };
}

function finding(over: Partial<FindingView> = {}): FindingView {
  return {
    id: "wcag:color-contrast",
    n: 1,
    kind: "wcag",
    evidence: "deterministic",
    isWcag: true,
    severity: "serious",
    identities: {},
    passLabel: null,
    title: "Contrast",
    criterionSc: "1.4.3",
    criterionName: "Contrast (Minimum)",
    elements: 3,
    ruleId: "color-contrast",
    desc: "d",
    impact: "i",
    fixText: "f",
    fixCode: null,
    fixGroups: null,
    guidance: null,
    measurement: null,
    preview: null,
    verdict: {
      kind: "unverifiable",
      totalElements: 3,
      sampledCleared: 0,
      sampledFailed: 0,
      reaudited: 0,
      fullyCovered: false,
      shared: true,
    },
    affectedSelectors: [".a"],
    selectors: [".a"],
    markers: [marker(1)],
    located: true,
    contexts: [],
    occurrences: [],
    noMarkerReason: "",
    ...over,
  };
}

describe("marking the screenshot", () => {
  it("places each located occurrence of every finding on the capture that shows it", () => {
    const f = finding({
      affectedSelectors: [".a", ".b"],
      markers: [
        marker(1, { selector: ".a", captureId: "viewport" }),
        marker(2, { selector: ".b", captureId: "r1" }),
      ],
    });

    expect(marksOnCapture([f], "viewport", [], [], t).map((m) => m.index)).toEqual([0]);
    expect(marksOnCapture([f], "r1", [], [], t).map((m) => m.index)).toEqual([1]);
    expect(marksOnCapture([f], "viewport", [], [], t)[0]).toMatchObject({
      findingId: "wcag:color-contrast",
      n: 1,
      total: 2,
      kind: "Serious",
    });
  });

  it("opens an occurrence on the capture that holds it", () => {
    const f = finding({
      affectedSelectors: [".a", ".b"],
      markers: [marker(2, { selector: ".b", captureId: "r1" })],
    });
    const [first, second] = occurrencesOf(f);

    expect(captureOfOccurrence(first, [], [])).toBeNull();
    expect(captureOfOccurrence(second, [], [])).toBe("r1");
  });

  it("finds a keyboard occurrence through the stop that reached it", () => {
    const f = finding({
      kind: "keyboard",
      ruleId: "focus-not-visible",
      markers: [],
      occurrences: [
        {
          stop: 2,
          selector: "main > button:nth-of-type(2)",
          tag: "button",
          label: "Stop 2",
          html: null,
          rect: null,
          onScreen: true,
          reason: "r",
          certainty: "conclusive",
        },
      ],
    });
    const [occ] = occurrencesOf(f);

    expect(occurrencePlaces(occ, [focusStop(2)], [])).toEqual([
      { captureId: "viewport", box: expect.objectContaining({ left: 10 }) },
    ]);
  });
});

describe("stepFocusStop", () => {
  const stops = [{ n: 1 }, { n: 4 }, { n: 9 }];

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

function focusStop(n: number, over: Partial<FocusStop> = {}): FocusStop {
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
      w: 60,
      h: 30,
      docX: 60 * n,
      docY: 40 * n,
      flowX: 60 * n,
      flowY: 40 * n,
      scrolled: false,
      flowContext: "",
    },
    ...over,
  };
}

describe("following the focus path on the screenshot", () => {
  it("draws only the stops that were measured inside this capture", () => {
    const views = buildStopViews(
      [
        focusStop(1),
        focusStop(40),
        focusStop(3, {
          rect: { ...focusStop(3).rect!, scrolled: true, flowContext: "#list" },
        }),
      ],
      1,
    );

    expect(views.map((v) => v.n)).toEqual([1]);
  });

  it("marks the selected stop as the current one and leaves the rest dimmed", () => {
    const views = buildStopViews([focusStop(1), focusStop(2)], 2);
    expect(views.map((v) => ({ n: v.n, current: v.current }))).toEqual([
      { n: 1, current: false },
      { n: 2, current: true },
    ]);
  });

  it("carries whether the stop had a visible focus ring, so the drawing can say so", () => {
    const views = buildStopViews([focusStop(1, { focusVisible: false })], 1);
    expect(views[0].visible).toBe(false);
  });

  it("resolves where the selected stop is, so the frame never falls back in silence", () => {
    const stops = [focusStop(1), focusStop(45)];

    expect(selectedStopPlacement(stops, 1)?.kind).toBe("placed");
    expect(selectedStopPlacement(stops, 45)).toEqual({ kind: "outside", docY: 1800 });
    expect(selectedStopPlacement(stops, null)).toBeNull();
  });
});
