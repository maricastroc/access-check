import { describe, expect, it } from "vitest";
import { chainOf, contrastReading, threadEnd } from "./chain";
import type { FindingView } from "./findings";
import type { Occurrence } from "./occurrences";
import type { Verdict } from "./verdict";

const verdict = (kind: Verdict["kind"], over: Partial<Verdict> = {}): Verdict => ({
  kind,
  totalElements: 1,
  sampledCleared: 0,
  sampledFailed: 0,
  reaudited: 0,
  fullyCovered: false,
  shared: false,
  ...over,
});

function finding(over: Partial<FindingView>): FindingView {
  return {
    id: "wcag:x",
    n: 1,
    kind: "wcag",
    evidence: "deterministic",
    isWcag: true,
    severity: "serious",
    passLabel: null,
    title: "t",
    criterionSc: null,
    criterionName: null,
    elements: 1,
    ruleId: "x",
    desc: "d",
    impact: "i",
    fixText: "Do the thing.",
    fixCode: null,
    fixGroups: null,
    guidance: null,
    measurement: null,
    preview: null,
    verdict: verdict("no-auto-fix"),
    affectedSelectors: [],
    selectors: [],
    identities: {},
    markers: [],
    located: false,
    noMarkerReason: "",
    contexts: [],
    occurrences: [],
    ...over,
  };
}

const occ = (selector: string): Occurrence =>
  ({ index: 0, selector, markers: [] }) as unknown as Occurrence;

const contrastFix = (from: string, to: string, ratio: string, was: string) =>
  `Replace text color ${from} with ${to} → ${ratio}:1 against #ffffff (was ${was}:1, needs 4.5:1).`;

describe("the chain says only what the engine knows", () => {
  it("runs a tested contrast fix from the element to a verified end", () => {
    const f = finding({
      ruleId: "color-contrast",
      verdict: verdict("verified"),
      fixGroups: [
        {
          text: contrastFix("#a09a8a", "#7a7569", "4.51", "2.76"),
          code: "color: #7a7569;",
          count: 1,
          selectors: [".muted"],
          confidence: "deterministic",
          verification: "verified",
        },
      ],
    });
    const chain = chainOf(f, occ(".muted"));

    expect(chain.stations).toEqual(["located", "evidence", "change", "verdict"]);
    expect(chain.end).toBe("tested");
    expect(chain.closed).toBe(true);
    expect(chain.evidence).toMatchObject({
      kind: "contrast",
      reading: { measured: 2.76, fixed: 4.51, fromHex: "#a09a8a", verification: "verified" },
    });
  });

  it("reads each occurrence from its own suggested fix", () => {
    const f = finding({
      ruleId: "color-contrast",
      verdict: verdict("sampled", { sampledCleared: 1, reaudited: 1, totalElements: 2 }),
      fixGroups: [
        {
          text: contrastFix("#a09a8a", "#7a7569", "4.51", "2.76"),
          code: "color: #7a7569;",
          count: 1,
          selectors: [".muted"],
          confidence: "deterministic",
          verification: "verified",
        },
        {
          text: contrastFix("#c0b9a6", "#7a7569", "4.51", "1.92"),
          code: "color: #7a7569;",
          count: 1,
          selectors: ["footer"],
          confidence: "deterministic",
          verification: "unchecked",
        },
      ],
    });

    expect(contrastReading(f, occ("footer"))).toMatchObject({
      measured: 1.92,
      verification: "unchecked",
    });
    expect(contrastReading(f, occ(".muted"))).toMatchObject({ verification: "verified" });
  });

  it("hands a missing name to a person once the words are suggested", () => {
    const chain = chainOf(
      finding({
        ruleId: "button-name",
        fixCode: 'aria-label="Basket"',
        verdict: verdict("contextual"),
      }),
      occ("button.cart"),
    );

    expect(chain.evidence).toEqual({ kind: "unnamed", role: "button" });
    expect(chain.stations).toEqual(["located", "evidence", "change", "verdict"]);
    expect(chain.end).toBe("person");
    expect(chain.closed).toBe(false);
  });

  it("reads a missing alt as an image nobody can hear", () => {
    const chain = chainOf(
      finding({ ruleId: "image-alt", verdict: verdict("contextual") }),
      occ("img"),
    );
    expect(chain.evidence).toEqual({ kind: "unnamed", role: "image" });
  });

  it("keeps a manual review human, with no change and no verification", () => {
    const chain = chainOf(
      finding({ kind: "manual-review", evidence: "heuristic", severity: null }),
      occ(".hero h1"),
    );

    expect(chain.stations).toEqual(["located", "evidence", "decide"]);
    expect(chain.evidence).toEqual({ kind: "unmeasured" });
    expect(chain.end).toBe("person");
    expect(chain.measured).toBe(false);
  });

  it("gives a best practice no verdict to reach", () => {
    const chain = chainOf(
      finding({ kind: "best-practice", severity: null, verdict: verdict("best-practice") }),
      null,
    );

    expect(chain.stations).toEqual(["located", "evidence", "change"]);
    expect(chain.end).toBeNull();
  });

  it("sends a keyboard fix back to a new audit instead of claiming it was tested", () => {
    const chain = chainOf(
      finding({ kind: "keyboard", ruleId: "focus-not-visible", verdict: verdict("complementary") }),
      occ("nav a"),
    );

    expect(chain.evidence).toEqual({ kind: "focus" });
    expect(chain.end).toBe("recheck");
    expect(chain.closed).toBe(false);
  });

  it("draws a guess as unmeasured from the start", () => {
    const chain = chainOf(
      finding({
        kind: "keyboard",
        ruleId: "focus-order",
        evidence: "heuristic",
        verdict: verdict("complementary"),
      }),
      null,
    );
    expect(chain.measured).toBe(false);
  });

  it("leaves out the change when the engine has none to offer", () => {
    const chain = chainOf(finding({ fixText: "  ", verdict: verdict("unverifiable") }), null);
    expect(chain.stations).toEqual(["located", "evidence", "verdict"]);
    expect(chain.end).toBe("untested");
  });

  it("maps every verdict onto the end of the thread", () => {
    const end = (kind: Verdict["kind"], over: Partial<Verdict> = {}) =>
      threadEnd(finding({ verdict: verdict(kind, over) }));
    expect(end("verified")).toBe("tested");
    expect(end("sampled", { sampledCleared: 2 })).toBe("tested");
    expect(end("sampled", { sampledFailed: 1 })).toBe("failed");
    expect(end("partial")).toBe("failed");
    expect(end("failed")).toBe("failed");
    expect(end("contextual")).toBe("person");
    expect(end("no-auto-fix")).toBe("person");
    expect(end("complementary")).toBe("recheck");
    expect(end("unverifiable")).toBe("untested");
  });
});
