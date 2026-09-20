import { describe, expect, it, vi } from "vitest";
import { collectFocusPath, type FocusPathIO } from "./keyboard";
import type { FocusProbe, FocusStyle } from "./dom/focus";

const VIEWPORT = { width: 1200, height: 800 };

const RING: FocusStyle = {
  outlineStyle: "solid",
  outlineWidth: "2px",
  outlineColor: "rgb(11, 87, 208)",
  boxShadow: "none",
  borderTopWidth: "0px",
  borderTopColor: "rgb(0, 0, 0)",
  backgroundColor: "rgba(0, 0, 0, 0)",
};

const NO_RING: FocusStyle = { ...RING, outlineStyle: "none", outlineWidth: "0px" };

function stop(selector: string, style: FocusStyle = RING): FocusProbe {
  return {
    isBody: false,
    selector,
    tag: "button",
    label: selector,
    identity: null,
    html: `<button>${selector}</button>`,
    isIframe: false,
    hasShadowRoot: false,
    style,
    rect: {
      x: 10,
      y: 10,
      w: 100,
      h: 30,
      docX: 10,
      docY: 10,
      flowX: 10,
      flowY: 10,
      scrolled: false,
      flowContext: "",
    },
  };
}

const BODY: FocusProbe = {
  isBody: true,
  selector: "",
  tag: "",
  label: "",
  identity: null,
  html: "",
  isIframe: false,
  hasShadowRoot: false,
  style: NO_RING,
  rect: null,
};

function io(stops: FocusProbe[], over: Partial<FocusPathIO> = {}) {
  let i = 0;
  const calls = { tabs: 0, shiftTabs: 0, ended: 0, rewound: 0 };
  const base: FocusPathIO = {
    start: vi.fn(async () => {}),
    focusFirst: vi.fn(async () => {
      calls.rewound += 1;
      return "focused" as const;
    }),
    focusSelector: vi.fn(async () => false),
    pressTab: vi.fn(async () => {
      calls.tabs += 1;
    }),
    pressShiftTab: vi.fn(async () => {
      calls.shiftTabs += 1;
    }),
    peekStop: vi.fn(async () => BODY),
    relativeToSeed: vi.fn(async () => "unknown" as const),
    readStop: vi.fn(async () => stops[i++] ?? BODY),
    readBaseStyles: vi.fn(async (selectors: string[]) =>
      Object.fromEntries(selectors.map((s) => [s, NO_RING])),
    ),
    readReach: vi.fn(async () => ({
      totalInteractive: stops.filter((s) => !s.isBody).length,
      reachableInteractive: stops.filter((s) => !s.isBody).length,
      unreachable: [],
      positiveTabindex: [],
      identities: {},
    })),
    end: vi.fn(async () => {
      calls.ended += 1;
    }),
  };
  return { io: { ...base, ...over }, calls };
}

function at(n: number) {
  return {
    n,
    selector: `#b${n}`,
    label: `#b${n}`,
    tag: "button",
    focusVisible: true,
    left: 1,
    top: 1,
    width: 8,
    height: 4,
  };
}

describe("collectFocusPath", () => {
  it("walks an ordinary sequence and stops when focus leaves the page", async () => {
    const { io: fake, calls } = io([stop("#a"), stop("#b"), stop("#c")]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath.map((s) => s.selector)).toEqual(["#a", "#b", "#c"]);
    expect(raw.cycleComplete).toBe(true);
    expect(raw.truncated).toBe(false);
    expect(raw.trapSelector).toBeNull();
    expect(calls.tabs).toBe(4);
    expect(calls.ended).toBe(1);
  });

  it("marks a stop whose focus style does not differ from its resting style", async () => {
    const { io: fake } = io([stop("#a"), stop("#invisible", NO_RING)]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath.map((s) => s.focusVisible)).toEqual([true, false]);
  });

  it("reports the element that will not let focus go", async () => {
    const { io: fake } = io([stop("#a"), stop("#trap"), stop("#trap")]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.trapSelector).toBe("#trap");
    expect(raw.focusPath).toHaveLength(2);
  });

  it("does not accuse an iframe or a shadow host of trapping focus", async () => {
    const host = { ...stop("#host"), hasShadowRoot: true };
    const { io: fake } = io([stop("#a"), host, host]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.trapSelector).toBeNull();
    expect(raw.truncated).toBe(true);
  });

  it("closes the loop when focus returns to the first stop", async () => {
    const { io: fake } = io([stop("#a"), stop("#b"), stop("#a")]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.cycleComplete).toBe(true);
    expect(raw.focusPath).toHaveLength(2);
  });

  it("finds nothing on a page with no focusable elements", async () => {
    const { io: fake, calls } = io([]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath).toEqual([]);
    expect(raw.cycleComplete).toBe(true);
    expect(calls.ended).toBe(1);
  });

  it("stops at its own cap and says so", async () => {
    const many = Array.from({ length: 80 }, (_, i) => stop(`#b${i}`));
    const { io: fake } = io(many);

    const raw = await collectFocusPath(fake, VIEWPORT, { maxStops: 12 });

    expect(raw.focusPath).toHaveLength(12);
    expect(raw.truncated).toBe(true);
  });

  it("stops when it runs out of time, keeping what it walked", async () => {
    const many = Array.from({ length: 80 }, (_, i) => stop(`#b${i}`));
    const { io: fake } = io(many, {
      pressTab: async () => {
        await new Promise((r) => setTimeout(r, 12));
      },
    });

    const raw = await collectFocusPath(fake, VIEWPORT, { maxMs: 60 });

    expect(raw.truncated).toBe(true);
    expect(raw.focusPath.length).toBeGreaterThan(0);
    expect(raw.focusPath.length).toBeLessThan(80);
  });

  it("lets go of the page even when a step throws", async () => {
    const { io: fake, calls } = io([stop("#a")], {
      pressTab: async () => {
        throw new Error("the tab went away");
      },
    });

    await expect(collectFocusPath(fake, VIEWPORT)).rejects.toThrow("the tab went away");
    expect(calls.ended).toBe(1);
  });

  it("survives a page that cannot answer about its resting styles", async () => {
    const { io: fake } = io([stop("#a")], {
      readBaseStyles: async () => ({}),
    });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath[0].focusVisible).toBe(true);
  });
});

describe("what the walk keeps for later inspection", () => {
  it("carries the snippet, the rectangle and both styles onto every stop", async () => {
    const { io: fake } = io([stop("#a", NO_RING)]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    const [only] = raw.focusPath;
    expect(only.html).toBe("<button>#a</button>");
    expect(only.rect).toEqual({
      x: 10,
      y: 10,
      w: 100,
      h: 30,
      docX: 10,
      docY: 10,
      flowX: 10,
      flowY: 10,
      scrolled: false,
      flowContext: "",
    });
    expect(only.onScreen).toBe(true);
    expect(only.focusStyle).toEqual(NO_RING);
    expect(only.baseStyle).toEqual(NO_RING);
  });

  it("says a stop was off-screen instead of inventing a position for it", async () => {
    const offscreen: FocusProbe = {
      ...stop("#below"),
      rect: {
        x: 10,
        y: 4000,
        w: 80,
        h: 20,
        docX: 10,
        docY: 4000,
        flowX: 10,
        flowY: 4000,
        scrolled: false,
        flowContext: "",
      },
    };
    const { io: fake } = io([offscreen]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath[0].onScreen).toBe(false);
    expect(raw.focusPath[0].top).toBeNull();
    expect(raw.focusPath[0].rect).toEqual({
      x: 10,
      y: 4000,
      w: 80,
      h: 20,
      docX: 10,
      docY: 4000,
      flowX: 10,
      flowY: 4000,
      scrolled: false,
      flowContext: "",
    });
  });

  it("records that no resting style could be read rather than guessing one", async () => {
    const { io: fake } = io([stop("#a")], { readBaseStyles: async () => ({}) });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.focusPath[0].baseStyle).toBeNull();
    expect(raw.focusPath[0].focusVisible).toBe(true);
  });
});

describe("taking the page back to the start of its tab order", () => {
  it("seeds the first control before walking, so two runs cover the same ground", async () => {
    const { io: fake, calls } = io([stop("#a"), stop("#b")]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(calls.rewound).toBe(1);
    expect(calls.shiftTabs).toBe(1);
    expect(raw.startedAtTop).toBe(true);
    expect(raw.focusPath.map((s) => s.selector)).toEqual(["#a", "#b"]);
  });

  it("treats a wrap to the end of the page as proof that nothing precedes the seed", async () => {
    const { io: fake, calls } = io([stop("#a"), stop("#b")], {
      peekStop: async () => stop("#last"),
      relativeToSeed: async () => "after",
    });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.startedAtTop).toBe(true);
    expect(raw.focusPath.map((s) => s.selector)).toEqual(["#a", "#b"]);
    expect(calls.tabs).toBe(2);
    expect(calls.rewound).toBe(2);
  });

  it("keeps stepping back while something really does precede the seed", async () => {
    let steps = 0;
    const { io: fake } = io([stop("#a")], {
      pressShiftTab: async () => {
        steps += 1;
      },
      peekStop: async () => (steps >= 3 ? BODY : stop("#earlier")),
      relativeToSeed: async () => "before",
    });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(steps).toBe(3);
    expect(raw.startedAtTop).toBe(true);
  });

  it("says it never reached the top rather than pretending it did", async () => {
    const { io: fake } = io([stop("#a")], {
      peekStop: async () => stop("#somewhere"),
      relativeToSeed: async () => "before",
    });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.startedAtTop).toBe(false);
  });

  it("counts a page with no controls at all as already at the top", async () => {
    const { io: fake, calls } = io([], { focusFirst: async () => "empty" });

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.startedAtTop).toBe(true);
    expect(calls.shiftTabs).toBe(0);
  });

  it("does not claim the top when focus could not be placed", async () => {
    const { io: fake } = io([stop("#a")], { focusFirst: async () => "failed" });

    expect((await collectFocusPath(fake, VIEWPORT)).startedAtTop).toBe(false);
  });
});

describe("a page with a single control", () => {
  it("does not call the only control a keyboard trap", async () => {
    const only = stop("#only");
    const { io: fake } = io([only, only]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.trapSelector).toBeNull();
    expect(raw.cycleComplete).toBe(true);
    expect(raw.stoppedBy).toBe("cycle");
    expect(raw.focusPath).toHaveLength(1);
  });

  it("still reports a trap when there was somewhere else to go", async () => {
    const { io: fake } = io([stop("#a"), stop("#trap"), stop("#trap")]);

    const raw = await collectFocusPath(fake, VIEWPORT);

    expect(raw.trapSelector).toBe("#trap");
    expect(raw.stoppedBy).toBe("trap");
  });
});

describe("picking a walk up where it stopped", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => stop(`#b${i + 1}`));

  it("caps the first round and says so", async () => {
    const { io: fake } = io(many(8));
    const first = await collectFocusPath(fake, VIEWPORT, { maxStops: 3 });

    expect(first.focusPath.map((s) => s.selector)).toEqual(["#b1", "#b2", "#b3"]);
    expect(first.truncated).toBe(true);
    expect(first.stoppedBy).toBe("cap");
    expect(first.cycleComplete).toBe(false);
  });

  it("continues from the last stop instead of walking the page again", async () => {
    const all = many(8);
    const { io: fake, calls } = io(all.slice(3), {
      focusSelector: vi.fn(async () => true),
    });

    const second = await collectFocusPath(fake, VIEWPORT, {
      maxStops: 3,
      resumeFrom: { focusPath: [1, 2, 3].map((n) => at(n)), startedAtTop: true },
    });

    expect(fake.focusSelector).toHaveBeenCalledWith("#b3");
    expect(calls.rewound).toBe(0);
    expect(second.focusPath.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(second.focusPath.map((s) => s.selector)).toEqual([
      "#b1",
      "#b2",
      "#b3",
      "#b4",
      "#b5",
      "#b6",
    ]);
  });

  it("keeps the first round's verdict on whether it started at the top", async () => {
    const { io: fake } = io(many(8).slice(3), { focusSelector: vi.fn(async () => true) });

    const second = await collectFocusPath(fake, VIEWPORT, {
      maxStops: 2,
      resumeFrom: { focusPath: [1, 2, 3].map((n) => at(n)), startedAtTop: false },
    });

    expect(second.startedAtTop).toBe(false);
  });

  it("closes the cycle when the walk comes back to the first stop of round one", async () => {
    const { io: fake } = io([stop("#b4"), stop("#b1")], {
      focusSelector: vi.fn(async () => true),
    });

    const second = await collectFocusPath(fake, VIEWPORT, {
      maxStops: 10,
      resumeFrom: { focusPath: [1, 2, 3].map((n) => at(n)), startedAtTop: true },
    });

    expect(second.cycleComplete).toBe(true);
    expect(second.truncated).toBe(false);
    expect(second.focusPath.map((s) => s.selector)).toEqual(["#b1", "#b2", "#b3", "#b4"]);
  });

  it("starts over when the stop it left off at is gone", async () => {
    const { io: fake, calls } = io(many(3), { focusSelector: vi.fn(async () => false) });

    const second = await collectFocusPath(fake, VIEWPORT, {
      maxStops: 5,
      resumeFrom: { focusPath: [at(1)], startedAtTop: true },
    });

    expect(calls.rewound).toBeGreaterThan(0);
    expect(second.focusPath.map((s) => s.n)).toEqual([1, 2, 3]);
  });

  it("stops counting a control as unreached once the walk has been there", async () => {
    const { io: fake } = io(many(8).slice(3), {
      focusSelector: vi.fn(async () => true),
      readReach: vi.fn(async () => ({
        totalInteractive: 8,
        reachableInteractive: 3,
        unreachable: ["#b1", "#b2", "#b3", "#b7", "#b8"],
        positiveTabindex: [],
        identities: {},
      })),
    });

    const second = await collectFocusPath(fake, VIEWPORT, {
      maxStops: 3,
      resumeFrom: { focusPath: [1, 2, 3].map((n) => at(n)), startedAtTop: true },
    });

    expect(second.unreachable).toEqual(["#b7", "#b8"]);
    expect(second.reachableInteractive).toBe(6);
  });
});
