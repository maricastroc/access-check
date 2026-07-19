import { describe, expect, it } from "vitest";
import {
  buildKeyboardReport,
  readingOrderInversions,
  type FocusStop,
  type RawKeyboard,
} from "./keyboard";

const stop = (
  n: number,
  left: number | null,
  top: number | null,
  extra: Partial<FocusStop> = {},
): FocusStop => ({
  n,
  selector: extra.selector ?? `#el-${n}`,
  label: extra.label ?? `el ${n}`,
  tag: extra.tag ?? "a",
  focusVisible: extra.focusVisible ?? true,
  left,
  top,
  width: extra.width ?? 5,
  height: extra.height ?? 2,
});

const rawBase: RawKeyboard = {
  focusPath: [],
  trapSelector: null,
  positiveTabindex: [],
  unreachable: [],
  totalInteractive: 0,
  reachableInteractive: 0,
  truncated: false,
  cycleComplete: true,
};

describe("readingOrderInversions", () => {
  it("a clean top-to-bottom order produces no inversions", () => {
    const stops = [stop(1, 10, 10), stop(2, 10, 30), stop(3, 10, 50)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("flags a jump to a line above", () => {
    const stops = [stop(1, 10, 50), stop(2, 10, 10)];
    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.selectors).toContain("#el-2");
  });

  it("flags a move back to the left on the same line", () => {
    const stops = [stop(1, 60, 20), stop(2, 10, 20)];
    expect(readingOrderInversions(stops).count).toBe(1);
  });

  it("micro-misalignment within the band does not count", () => {
    const stops = [stop(1, 30, 20), stop(2, 28, 19)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("ignores off-screen stops (null position)", () => {
    const stops = [stop(1, 10, 10), stop(2, null, null), stop(3, 10, 40)];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("does not count the same selector twice", () => {
    const stops = [
      stop(1, 60, 40),
      stop(2, 10, 10, { selector: "#dup" }),
      stop(3, 60, 40),
      stop(4, 10, 10, { selector: "#dup" }),
    ];
    const inv = readingOrderInversions(stops);
    expect(inv.selectors).toEqual([...new Set(inv.selectors)]);
  });
});

describe("buildKeyboardReport", () => {
  it("no symptoms → no findings", () => {
    const r = buildKeyboardReport({ ...rawBase, focusPath: [stop(1, 10, 10), stop(2, 10, 30)] });
    expect(r.findings).toHaveLength(0);
    expect(r.totalStops).toBe(2);
  });

  it("a keyboard trap becomes a critical finding", () => {
    const r = buildKeyboardReport({
      ...rawBase,
      trapSelector: "#modal",
      focusPath: [stop(1, 10, 10)],
    });
    const trap = r.findings.find((f) => f.id === "keyboard-trap");
    expect(trap?.severity).toBe("critical");
    expect(trap?.selectors).toContain("#modal");
  });

  it("invisible focus counts only the stops without an indicator", () => {
    const focusPath = [
      stop(1, 10, 10, { focusVisible: true }),
      stop(2, 10, 30, { focusVisible: false, selector: "#hidden" }),
      stop(3, 10, 50, { focusVisible: false, selector: "#hidden2" }),
    ];
    const r = buildKeyboardReport({ ...rawBase, focusPath });
    const f = r.findings.find((x) => x.id === "focus-not-visible");
    expect(f?.count).toBe(2);
    expect(f?.selectors).toEqual(["#hidden", "#hidden2"]);
  });

  it("an unreachable control is only reported with a complete cycle and no truncation", () => {
    const withTruncation = buildKeyboardReport({
      ...rawBase,
      unreachable: ["#ghost"],
      truncated: true,
      cycleComplete: false,
    });
    expect(withTruncation.findings.find((f) => f.id === "unreachable-control")).toBeUndefined();

    const complete = buildKeyboardReport({
      ...rawBase,
      unreachable: ["#ghost"],
      truncated: false,
      cycleComplete: true,
    });
    expect(complete.findings.find((f) => f.id === "unreachable-control")?.severity).toBe("serious");
  });

  it("positive tabindex becomes a moderate finding", () => {
    const r = buildKeyboardReport({ ...rawBase, positiveTabindex: ["#a", "#b"] });
    const f = r.findings.find((x) => x.id === "positive-tabindex");
    expect(f?.count).toBe(2);
    expect(f?.severity).toBe("moderate");
  });

  it("sorts findings by severity (critical first)", () => {
    const r = buildKeyboardReport({
      ...rawBase,
      trapSelector: "#trap",
      positiveTabindex: ["#a"],
      focusPath: [
        stop(1, 10, 50, { focusVisible: false }),
        stop(2, 10, 10, { focusVisible: false }),
      ],
    });
    expect(r.findings[0].severity).toBe("critical");
    const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    for (let i = 1; i < r.findings.length; i++) {
      expect(rank[r.findings[i].severity]).toBeGreaterThanOrEqual(rank[r.findings[i - 1].severity]);
    }
  });

  it("propagates reachability counts", () => {
    const r = buildKeyboardReport({
      ...rawBase,
      totalInteractive: 12,
      reachableInteractive: 10,
    });
    expect(r.totalInteractive).toBe(12);
    expect(r.reachableInteractive).toBe(10);
  });
});
