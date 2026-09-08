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
  startedAtTop: true,
  stoppedBy: "cycle",
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

const RING = {
  outlineStyle: "solid",
  outlineWidth: "2px",
  outlineColor: "rgb(11, 87, 208)",
  boxShadow: "none",
  borderTopWidth: "0px",
  borderTopColor: "rgb(0, 0, 0)",
  backgroundColor: "rgba(0, 0, 0, 0)",
};

const NO_RING = { ...RING, outlineStyle: "none", outlineWidth: "0px" };

describe("what each finding lets you inspect", () => {
  it("gives every invisible stop its own occurrence, with the evidence attached", () => {
    const path = [
      stop(1, 10, 10),
      {
        ...stop(2, 10, 30, { focusVisible: false, selector: "#ghost", tag: "a", label: "Buy now" }),
        html: '<a href="/buy">Buy now</a>',
        rect: { x: 12, y: 240, w: 80, h: 20 },
        onScreen: true,
        focusStyle: NO_RING,
        baseStyle: NO_RING,
      },
    ];

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }).findings.find(
      (x) => x.id === "focus-not-visible",
    )!;

    expect(f.occurrences).toHaveLength(f.count);
    const [only] = f.occurrences;
    expect(only.stop).toBe(2);
    expect(only.selector).toBe("#ghost");
    expect(only.label).toBe("Buy now");
    expect(only.html).toBe('<a href="/buy">Buy now</a>');
    expect(only.rect).toEqual({ x: 12, y: 240, w: 80, h: 20 });
    expect(only.certainty).toBe("conclusive");
  });

  it("names the visual change that did not happen", () => {
    const path = [
      {
        ...stop(1, 10, 10, { focusVisible: false }),
        focusStyle: NO_RING,
        baseStyle: NO_RING,
      },
    ];

    const reason = buildKeyboardReport({ ...rawBase, focusPath: path }).findings[0].occurrences[0]
      .reason;

    expect(reason).toContain("no outline appeared");
    expect(reason).toContain("outline-style: none");
    expect(reason).toContain("the box-shadow stayed none");
    expect(reason).toContain("the background stayed rgba(0, 0, 0, 0)");
    expect(reason).toContain("A focus indicator is expected");
  });

  it("falls back to a plain statement when the styles were never recorded", () => {
    const path = [stop(1, 10, 10, { focusVisible: false })];
    const reason = buildKeyboardReport({ ...rawBase, focusPath: path }).findings[0].occurrences[0]
      .reason;

    expect(reason).toContain("no detectable outline");
    expect(reason).not.toContain("undefined");
  });

  it("shows each order jump as a move between two numbered stops", () => {
    const path = [
      { ...stop(1, 10, 80, { label: "Footer link" }), rect: { x: 10, y: 640, w: 40, h: 20 } },
      { ...stop(2, 10, 5, { label: "Skip to content" }), rect: { x: 10, y: 40, w: 40, h: 20 } },
    ];

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }).findings.find(
      (x) => x.id === "focus-order",
    )!;

    expect(f.occurrences).toHaveLength(1);
    const [jump] = f.occurrences;
    expect(jump.from).toBe(1);
    expect(jump.to).toBe(2);
    expect(jump.reason).toContain("Stop 1 → Stop 2");
    expect(jump.reason).toContain("focus moved back up the page");
    expect(jump.reason).toContain("near the bottom of the page");
    expect(jump.reason).toContain("near the top of the page");
    expect(jump.reason).toContain("640px → 40px");
  });

  it("does not present a geometric jump as a settled violation", () => {
    const path = [stop(1, 10, 80), stop(2, 10, 5)];
    const f = buildKeyboardReport({ ...rawBase, focusPath: path }).findings.find(
      (x) => x.id === "focus-order",
    )!;

    expect(f.occurrences[0].certainty).toBe("needs-review");
    expect(f.occurrences[0].reason).toContain("not proof");
    expect(f.desc).toContain("need a human check");
  });

  it("keeps the count and the list of jumps in step", () => {
    const path = [
      stop(1, 10, 80),
      stop(2, 10, 5, { selector: "#dup" }),
      stop(3, 10, 80),
      stop(4, 10, 5, { selector: "#dup" }),
    ];

    const inv = readingOrderInversions(path);
    const f = buildKeyboardReport({ ...rawBase, focusPath: path }).findings.find(
      (x) => x.id === "focus-order",
    )!;

    expect(inv.jumps).toHaveLength(inv.count);
    expect(f.occurrences).toHaveLength(f.count);
  });

  it("marks a control the walk never reached as having no stop number", () => {
    const f = buildKeyboardReport({
      ...rawBase,
      unreachable: ["#ghost"],
      focusPath: [stop(1, 10, 10)],
    }).findings.find((x) => x.id === "unreachable-control")!;

    expect(f.occurrences[0].stop).toBeNull();
    expect(f.occurrences[0].selector).toBe("#ghost");
    expect(f.occurrences[0].certainty).toBe("needs-review");
  });

  it("borrows what the walk saw when it did reach the element", () => {
    const f = buildKeyboardReport({
      ...rawBase,
      positiveTabindex: ["#el-1"],
      focusPath: [{ ...stop(1, 10, 10, { label: "Search" }), html: "<input>" }],
    }).findings.find((x) => x.id === "positive-tabindex")!;

    expect(f.occurrences[0].stop).toBe(1);
    expect(f.occurrences[0].label).toBe("Search");
    expect(f.occurrences[0].html).toBe("<input>");
    expect(f.occurrences[0].certainty).toBe("conclusive");
  });

  it("lists every occurrence even when the selector list is capped", () => {
    const path = Array.from({ length: 12 }, (_, i) =>
      stop(i + 1, 10, 10 + i * 10, { focusVisible: false, selector: `#s${i}` }),
    );

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }).findings.find(
      (x) => x.id === "focus-not-visible",
    )!;

    expect(f.selectors).toHaveLength(8);
    expect(f.occurrences).toHaveLength(12);
  });
});

describe("what a walk is allowed to conclude", () => {
  it("will not call controls unreachable when the walk never started at the top", async () => {
    const midway = buildKeyboardReport({
      ...rawBase,
      startedAtTop: false,
      unreachable: ["#one", "#two"],
      truncated: false,
      cycleComplete: true,
      focusPath: [stop(1, 10, 10)],
    });

    expect(midway.findings.find((f) => f.id === "unreachable-control")).toBeUndefined();
    expect(midway.startedAtTop).toBe(false);
  });

  it("reports them when the walk did start at the top and came round", () => {
    const full = buildKeyboardReport({
      ...rawBase,
      startedAtTop: true,
      unreachable: ["#one", "#two"],
      truncated: false,
      cycleComplete: true,
      focusPath: [stop(1, 10, 10)],
    });

    expect(full.findings.find((f) => f.id === "unreachable-control")?.count).toBe(2);
  });
});
