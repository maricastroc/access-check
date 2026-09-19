import { describe, expect, it } from "vitest";
import {
  buildKeyboardReport,
  readingOrderInversions,
  type FocusRect,
  type FocusStop,
  type RawKeyboard,
} from "./keyboard";
import { computeScore } from "./derive";
import { ownRuleViolations } from "./scored";
import { translator } from "../i18n/t";

const t = translator();

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

const placed = (
  n: number,
  viewport: { left: number; top: number },
  rect: FocusRect,
  extra: Partial<FocusStop> = {},
): FocusStop => ({
  ...stop(n, viewport.left, viewport.top, extra),
  height: 3,
  rect,
});

const ROW = { w: 60, h: 24 };

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

  it("controls on the same header row are not a jump when they are centred differently", () => {
    const stops = [
      stop(1, 100, 23, { height: 20 }),
      stop(2, 200, 17, { height: 32 }),
      stop(3, 300, 15, { height: 36 }),
    ];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("still flags a move back to the left across overlapping rows", () => {
    const stops = [stop(1, 200, 20, { height: 32 }), stop(2, 40, 23, { height: 20 })];
    expect(readingOrderInversions(stops).count).toBe(1);
  });

  it("uses document position, so a scrolled walk down the page is not a jump", () => {
    const stops = [
      {
        ...stop(1, 10, 80, { height: 3 }),
        rect: { x: 120, y: 640, w: 60, h: 24, docX: 120, docY: 600 },
      },
      {
        ...stop(2, 10, 20, { height: 3 }),
        rect: { x: 120, y: 160, w: 60, h: 24, docX: 120, docY: 5100 },
      },
    ];
    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("flags a document-order inversion even when the viewport says otherwise", () => {
    const stops = [
      {
        ...stop(1, 10, 20, { height: 3 }),
        rect: { x: 120, y: 160, w: 60, h: 24, docX: 120, docY: 5100 },
      },
      {
        ...stop(2, 10, 80, { height: 3 }),
        rect: { x: 120, y: 640, w: 60, h: 24, docX: 120, docY: 600 },
      },
    ];
    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.jumps[0].direction).toBe("up");
  });

  it("prefers the flow position, so a list that only scrolled inside its container is no jump", () => {
    const stops = [
      placed(
        1,
        { left: 40, top: 82 },
        { x: 480, y: 658, ...ROW, docX: 480, docY: 3666, flowX: 480, flowY: 3666, scrolled: true },
      ),
      placed(
        2,
        { left: 10, top: 65 },
        { x: 120, y: 526, ...ROW, docX: 120, docY: 3534, flowX: 120, flowY: 3763, scrolled: true },
      ),
    ];

    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("still flags an inversion that is real in the flow, not only in what was painted", () => {
    const stops = [
      placed(
        1,
        { left: 10, top: 65 },
        { x: 120, y: 526, ...ROW, docX: 120, docY: 3534, flowX: 120, flowY: 3763, scrolled: true },
      ),
      placed(
        2,
        { left: 40, top: 82 },
        { x: 480, y: 658, ...ROW, docX: 480, docY: 3666, flowX: 480, flowY: 3666, scrolled: true },
      ),
    ];

    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.jumps[0].direction).toBe("up");
    expect(inv.jumps[0].basis).toBe("flow");
  });

  it("flags a move back to the left inside one scrolled row", () => {
    const stops = [
      placed(
        1,
        { left: 40, top: 20 },
        { x: 480, y: 160, ...ROW, docX: 480, docY: 160, flowX: 480, flowY: 900, scrolled: true },
      ),
      placed(
        2,
        { left: 10, top: 20 },
        { x: 120, y: 160, ...ROW, docX: 120, docY: 160, flowX: 120, flowY: 900, scrolled: true },
      ),
    ];

    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.jumps[0].direction).toBe("back");
    expect(inv.jumps[0].basis).toBe("flow");
  });

  it("falls back to the painted position when no flow coordinate was measured", () => {
    const stops = [
      placed(1, { left: 10, top: 20 }, { x: 120, y: 160, ...ROW, docX: 120, docY: 5100 }),
      placed(2, { left: 10, top: 80 }, { x: 120, y: 640, ...ROW, docX: 120, docY: 600 }),
    ];

    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(1);
    expect(inv.jumps[0].basis).toBe("document");
  });

  it("falls back to the viewport when neither page coordinate was measured", () => {
    const inv = readingOrderInversions([stop(1, 10, 50), stop(2, 10, 10)]);
    expect(inv.count).toBe(1);
    expect(inv.jumps[0].basis).toBe("viewport");
  });

  it("does not mix bases when only one of the two stops carries a flow coordinate", () => {
    const stops = [
      placed(
        1,
        { left: 10, top: 20 },
        { x: 120, y: 160, ...ROW, docX: 120, docY: 600, flowX: 120, flowY: 600, scrolled: true },
      ),
      placed(2, { left: 10, top: 80 }, { x: 120, y: 640, ...ROW, docX: 120, docY: 5100 }),
    ];

    const inv = readingOrderInversions(stops);
    expect(inv.count).toBe(0);
  });

  it("will not compare two stops that live in different scrolling contexts", () => {
    const stops = [
      placed(
        1,
        { left: 90, top: 60 },
        {
          x: 1104,
          y: 480,
          w: 40,
          h: 40,
          docX: 1104,
          docY: 3570,
          flowX: 1104,
          flowY: 3836,
          scrolled: true,
          flowContext: "#list",
        },
      ),
      placed(
        2,
        { left: 37, top: 55 },
        {
          x: 451,
          y: 440,
          w: 200,
          h: 44,
          docX: 451,
          docY: 3788,
          flowX: 451,
          flowY: 3788,
          scrolled: false,
          flowContext: "",
        },
      ),
    ];

    expect(readingOrderInversions(stops).count).toBe(0);
  });

  it("still compares two stops inside the same container", () => {
    const inside = (n: number, flowY: number, flowX: number) =>
      placed(
        n,
        { left: 10, top: 50 },
        {
          x: flowX,
          y: 400,
          w: 60,
          h: 24,
          docX: flowX,
          docY: 400,
          flowX,
          flowY,
          scrolled: true,
          flowContext: "#list",
        },
      );

    expect(readingOrderInversions([inside(1, 900, 120), inside(2, 1020, 120)]).count).toBe(0);
    expect(readingOrderInversions([inside(1, 1020, 120), inside(2, 900, 120)]).count).toBe(1);
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
    const r = buildKeyboardReport({ ...rawBase, focusPath: [stop(1, 10, 10), stop(2, 10, 30)] }, t);
    expect(r.findings).toHaveLength(0);
    expect(r.totalStops).toBe(2);
  });

  it("a keyboard trap becomes a critical finding", () => {
    const r = buildKeyboardReport(
      {
        ...rawBase,
        trapSelector: "#modal",
        focusPath: [stop(1, 10, 10)],
      },
      t,
    );
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
    const r = buildKeyboardReport({ ...rawBase, focusPath }, t);
    const f = r.findings.find((x) => x.id === "focus-not-visible");
    expect(f?.count).toBe(2);
    expect(f?.selectors).toEqual(["#hidden", "#hidden2"]);
  });

  it("only calls a control unreachable after a complete cycle with no truncation", () => {
    const withTruncation = buildKeyboardReport(
      {
        ...rawBase,
        unreachable: ["#ghost"],
        truncated: true,
        cycleComplete: false,
      },
      t,
    ).findings.find((f) => f.id === "unreachable-control");

    expect(withTruncation?.evidence).toBe("heuristic");
    expect(withTruncation?.severity).toBe("moderate");

    const complete = buildKeyboardReport(
      {
        ...rawBase,
        unreachable: ["#ghost"],
        truncated: false,
        cycleComplete: true,
      },
      t,
    );
    expect(complete.findings.find((f) => f.id === "unreachable-control")?.severity).toBe("serious");
  });

  it("positive tabindex becomes a moderate finding", () => {
    const r = buildKeyboardReport({ ...rawBase, positiveTabindex: ["#a", "#b"] }, t);
    const f = r.findings.find((x) => x.id === "positive-tabindex");
    expect(f?.count).toBe(2);
    expect(f?.severity).toBe("moderate");
  });

  it("sorts findings by severity (critical first)", () => {
    const r = buildKeyboardReport(
      {
        ...rawBase,
        trapSelector: "#trap",
        positiveTabindex: ["#a"],
        focusPath: [
          stop(1, 10, 50, { focusVisible: false }),
          stop(2, 10, 10, { focusVisible: false }),
        ],
      },
      t,
    );
    expect(r.findings[0].severity).toBe("critical");
    const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    for (let i = 1; i < r.findings.length; i++) {
      expect(rank[r.findings[i].severity]).toBeGreaterThanOrEqual(rank[r.findings[i - 1].severity]);
    }
  });

  it("propagates reachability counts", () => {
    const r = buildKeyboardReport(
      {
        ...rawBase,
        totalInteractive: 12,
        reachableInteractive: 10,
      },
      t,
    );
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

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings.find(
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

    const reason = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings[0]
      .occurrences[0].reason;

    expect(reason).toContain("no outline appeared");
    expect(reason).toContain("outline-style: none");
    expect(reason).toContain("the box-shadow stayed none");
    expect(reason).toContain("the background stayed rgba(0, 0, 0, 0)");
    expect(reason).toContain("A focus indicator is expected");
  });

  it("falls back to a plain statement when the styles were never recorded", () => {
    const path = [stop(1, 10, 10, { focusVisible: false })];
    const reason = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings[0]
      .occurrences[0].reason;

    expect(reason).toContain("no detectable outline");
    expect(reason).not.toContain("undefined");
  });

  it("shows each order jump as a move between two numbered stops", () => {
    const path = [
      { ...stop(1, 10, 80, { label: "Footer link" }), rect: { x: 10, y: 640, w: 40, h: 20 } },
      { ...stop(2, 10, 5, { label: "Skip to content" }), rect: { x: 10, y: 40, w: 40, h: 20 } },
    ];

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings.find(
      (x) => x.id === "focus-order",
    )!;

    expect(f.occurrences).toHaveLength(1);
    const [jump] = f.occurrences;
    expect(jump.from).toBe(1);
    expect(jump.to).toBe(2);
    expect(jump.reason).toContain("Stop 1 → Stop 2");
    expect(jump.reason).toContain("focus moved back up the page");
    expect(jump.reason).toContain("near the bottom of the viewport");
    expect(jump.reason).toContain("near the top of the viewport");
    expect(jump.reason).toContain("640px → 40px");
  });

  it("does not present a geometric jump as a settled violation", () => {
    const path = [stop(1, 10, 80), stop(2, 10, 5)];
    const f = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings.find(
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
    const f = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings.find(
      (x) => x.id === "focus-order",
    )!;

    expect(inv.jumps).toHaveLength(inv.count);
    expect(f.occurrences).toHaveLength(f.count);
  });

  it("marks a control the walk never reached as having no stop number", () => {
    const f = buildKeyboardReport(
      {
        ...rawBase,
        unreachable: ["#ghost"],
        focusPath: [stop(1, 10, 10)],
      },
      t,
    ).findings.find((x) => x.id === "unreachable-control")!;

    expect(f.occurrences[0].stop).toBeNull();
    expect(f.occurrences[0].selector).toBe("#ghost");
    expect(f.occurrences[0].certainty).toBe("needs-review");
  });

  it("borrows what the walk saw when it did reach the element", () => {
    const f = buildKeyboardReport(
      {
        ...rawBase,
        positiveTabindex: ["#el-1"],
        focusPath: [{ ...stop(1, 10, 10, { label: "Search" }), html: "<input>" }],
      },
      t,
    ).findings.find((x) => x.id === "positive-tabindex")!;

    expect(f.occurrences[0].stop).toBe(1);
    expect(f.occurrences[0].label).toBe("Search");
    expect(f.occurrences[0].html).toBe("<input>");
    expect(f.occurrences[0].certainty).toBe("conclusive");
  });

  it("lists every occurrence even when the selector list is capped", () => {
    const path = Array.from({ length: 12 }, (_, i) =>
      stop(i + 1, 10, 10 + i * 10, { focusVisible: false, selector: `#s${i}` }),
    );

    const f = buildKeyboardReport({ ...rawBase, focusPath: path }, t).findings.find(
      (x) => x.id === "focus-not-visible",
    )!;

    expect(f.selectors).toHaveLength(8);
    expect(f.occurrences).toHaveLength(12);
  });
});

describe("what a walk is allowed to conclude", () => {
  it("will not call controls unreachable when the walk never started at the top", async () => {
    const midway = buildKeyboardReport(
      {
        ...rawBase,
        startedAtTop: false,
        unreachable: ["#one", "#two"],
        truncated: false,
        cycleComplete: true,
        focusPath: [stop(1, 10, 10)],
      },
      t,
    );

    const reach = midway.findings.find((f) => f.id === "unreachable-control");
    expect(reach?.evidence).toBe("heuristic");
    expect(reach?.title).toContain("never reached");
    expect(midway.startedAtTop).toBe(false);
  });

  it("reports them when the walk did start at the top and came round", () => {
    const full = buildKeyboardReport(
      {
        ...rawBase,
        startedAtTop: true,
        unreachable: ["#one", "#two"],
        truncated: false,
        cycleComplete: true,
        focusPath: [stop(1, 10, 10)],
      },
      t,
    );

    expect(full.findings.find((f) => f.id === "unreachable-control")?.count).toBe(2);
  });
});

describe("the evidence a focus-order jump shows", () => {
  const reasonOf = (focusPath: FocusStop[]): string => {
    const report = buildKeyboardReport({ ...rawBase, focusPath }, t);
    const finding = report.findings.find((f) => f.id === "focus-order");
    expect(finding).toBeDefined();
    return finding!.occurrences[0].reason;
  };

  it("quotes the flow position, not the painted one, when the flow decided it", () => {
    const reason = reasonOf([
      placed(
        1,
        { left: 10, top: 65 },
        { x: 120, y: 526, ...ROW, docX: 120, docY: 3534, flowX: 120, flowY: 3763, scrolled: true },
      ),
      placed(
        2,
        { left: 40, top: 82 },
        { x: 480, y: 658, ...ROW, docX: 480, docY: 3666, flowX: 480, flowY: 3666, scrolled: true },
      ),
    ]);

    expect(reason).toContain("3763");
    expect(reason).toContain("3666");
    expect(reason).not.toContain("526");
    expect(reason).not.toContain("658");
    expect(reason).not.toContain("viewport");
  });

  it("quotes the painted position when there was no flow coordinate", () => {
    const reason = reasonOf([
      placed(1, { left: 10, top: 20 }, { x: 120, y: 160, ...ROW, docX: 120, docY: 5100 }),
      placed(2, { left: 10, top: 80 }, { x: 120, y: 640, ...ROW, docX: 120, docY: 600 }),
    ]);

    expect(reason).toContain("5100");
    expect(reason).toContain("600");
    expect(reason).not.toContain("viewport");
  });

  it("says viewport, and only viewport, when that is all it measured", () => {
    const reason = reasonOf([stop(1, 10, 50), stop(2, 10, 10)]);

    expect(reason).toContain("viewport");
    expect(reason).not.toContain("of the page (");
  });

  it("never describes a stop's place on the page from its place in the viewport", () => {
    const reason = reasonOf([
      placed(1, { left: 10, top: 82 }, { x: 120, y: 658, ...ROW, docX: 120, docY: 3666 }),
      placed(2, { left: 10, top: 65 }, { x: 120, y: 526, ...ROW, docX: 120, docY: 3534 }),
    ]);

    expect(reason).not.toContain("of the page");
  });
});

describe("which axis a jump's evidence quotes", () => {
  const reasonOf = (focusPath: FocusStop[]): string => {
    const report = buildKeyboardReport({ ...rawBase, focusPath }, t);
    return report.findings.find((f) => f.id === "focus-order")!.occurrences[0].reason;
  };

  const at = (n: number, x: number, y: number, viewport: { left: number; top: number }) =>
    placed(n, viewport, {
      x,
      y,
      w: 60,
      h: 24,
      docX: x,
      docY: y,
      flowX: x,
      flowY: y,
      scrolled: false,
      flowContext: "",
    });

  it("quotes the sideways measure when focus went back to the left", () => {
    const reason = reasonOf([
      at(1, 880, 1533, { left: 70, top: 50 }),
      at(2, 240, 1533, { left: 20, top: 50 }),
    ]);

    expect(reason).toContain("back to the left");
    expect(reason).toContain("880");
    expect(reason).toContain("240");
    expect(reason).not.toContain("1533");
  });

  it("quotes the downward measure when focus went back up", () => {
    const reason = reasonOf([
      at(1, 240, 3800, { left: 20, top: 80 }),
      at(2, 240, 1200, { left: 20, top: 20 }),
    ]);

    expect(reason).toContain("back up");
    expect(reason).toContain("3800");
    expect(reason).toContain("1200");
  });

  it("names the edge it measured from when all it had was the viewport", () => {
    const onlyOnScreen = (n: number, x: number, y: number, left: number, top: number) =>
      placed(n, { left, top }, { x, y, w: 60, h: 24 });

    const sideways = reasonOf([
      onlyOnScreen(1, 880, 320, 70, 40),
      onlyOnScreen(2, 240, 320, 20, 40),
    ]);
    const downward = reasonOf([
      onlyOnScreen(1, 240, 640, 20, 80),
      onlyOnScreen(2, 240, 160, 20, 20),
    ]);

    expect(sideways).toContain("left of the viewport");
    expect(sideways).toContain("880");
    expect(downward).toContain("top of the viewport");
    expect(downward).toContain("640");
  });

  it("says nothing about pixels when it never measured a rectangle", () => {
    const reason = reasonOf([stop(1, 70, 40), stop(2, 20, 40)]);
    expect(reason).not.toContain("px →");
  });

  it("never reports a horizontal move as two identical numbers", () => {
    const reason = reasonOf([
      at(1, 880, 1533, { left: 70, top: 50 }),
      at(2, 240, 1533, { left: 20, top: 50 }),
    ]);
    const numbers = reason.match(/(\d+)px → (\d+)px/);

    expect(numbers).not.toBeNull();
    expect(numbers![1]).not.toBe(numbers![2]);
  });
});

describe("what an incomplete walk is allowed to say about reach", () => {
  const partial = {
    ...rawBase,
    unreachable: ["#ghost", "#phantom"],
    truncated: true,
    cycleComplete: false,
    stoppedBy: "cap" as const,
    focusPath: [stop(1, 10, 10)],
  };

  it("no longer goes silent when the walk stopped early", () => {
    const f = buildKeyboardReport(partial, t).findings.find((x) => x.id === "unreachable-control");
    expect(f).toBeDefined();
    expect(f?.count).toBe(2);
  });

  it("is born heuristic there, so it costs no points", () => {
    const f = buildKeyboardReport(partial, t).findings.find((x) => x.id === "unreachable-control");
    expect(f?.evidence).toBe("heuristic");
    expect(computeScore(ownRuleViolations({ keyboard: buildKeyboardReport(partial, t) }))).toBe(
      100,
    );
  });

  it("says the walk ended rather than calling them unreachable", () => {
    const f = buildKeyboardReport(partial, t).findings.find((x) => x.id === "unreachable-control");
    expect(f?.title).toContain("never reached");
    expect(f?.desc).toContain("not proof");
  });

  it("keeps the conclusive reading measured and serious", () => {
    const complete = buildKeyboardReport(
      { ...partial, truncated: false, cycleComplete: true, stoppedBy: "cycle" },
      t,
    ).findings.find((x) => x.id === "unreachable-control");

    expect(complete?.evidence).toBe("measured");
    expect(complete?.severity).toBe("serious");
    expect(complete?.title).not.toContain("never reached");
  });

  it("does not flood the report when a capped walk left many behind", () => {
    const many = Array.from({ length: 60 }, (_, i) => `#c${i}`);
    const f = buildKeyboardReport({ ...partial, unreachable: many }, t).findings.find(
      (x) => x.id === "unreachable-control",
    );

    expect(f?.count).toBe(60);
    expect(f?.occurrences.length).toBeLessThanOrEqual(24);
    expect(f?.selectors).toHaveLength(8);
  });
});
