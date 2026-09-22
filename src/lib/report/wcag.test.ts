import { describe, expect, it } from "vitest";
import { buildWcagReading, parseCriterion, wcagReadingOf } from "./wcag";
import { SCORING_VERSION, withScoring, type Scorable } from "../scan/scored";
import { standingOf } from "./standing";
import type { EvidenceClass, Severity } from "../scan/types";

describe("parseCriterion", () => {
  it("splits the engine criterion string into SC number and name", () => {
    expect(parseCriterion("WCAG 1.4.3 · Contrast (Minimum)")).toMatchObject({
      sc: "1.4.3",
      name: "Contrast (Minimum)",
    });
  });

  it("handles a criterion with no name", () => {
    expect(parseCriterion("WCAG 2.4.1")).toMatchObject({ sc: "2.4.1", name: null });
  });

  it("returns null SC for a rule-id fallback", () => {
    expect(parseCriterion("color-contrast").sc).toBeNull();
  });
});

describe("buildWcagReading", () => {
  it("marks AA failing for a contrast violation and A clean", () => {
    const r = buildWcagReading([{ criterion: "WCAG 1.4.3 · Contrast (Minimum)" }]);
    expect(r.aa.fails).toBe(true);
    expect(r.aa.criteria[0]).toMatchObject({ sc: "1.4.3", name: "Contrast (Minimum)" });
    expect(r.a.fails).toBe(false);
    expect(r.aaa).toEqual({ evaluated: false });
  });

  it("classifies level-A criteria under A", () => {
    const r = buildWcagReading([{ criterion: "WCAG 1.1.1 · Non-text Content" }]);
    expect(r.a.fails).toBe(true);
    expect(r.aa.fails).toBe(false);
  });

  it("dedupes repeated criteria and sorts numerically", () => {
    const r = buildWcagReading([
      { criterion: "WCAG 1.4.11 · Non-text Contrast" },
      { criterion: "WCAG 1.4.3 · Contrast (Minimum)" },
      { criterion: "WCAG 1.4.3 · Contrast (Minimum)" },
    ]);
    expect(r.aa.criteria.map((c) => c.sc)).toEqual(["1.4.3", "1.4.11"]);
  });

  it("never evaluates AAA", () => {
    const r = buildWcagReading([]);
    expect(r.a.fails).toBe(false);
    expect(r.aa.fails).toBe(false);
    expect(r.aaa.evaluated).toBe(false);
  });
});

function ownFinding(
  id: string,
  criterion: string,
  severity: Severity,
  evidence: EvidenceClass = "measured",
) {
  return {
    id,
    severity,
    evidence,
    criterion,
    title: id,
    desc: "desc",
    fix: "fix",
    count: 1,
    selectors: ["#x"],
  };
}

type Reading = Parameters<typeof wcagReadingOf>[0];

const onlyOwn = (findings: ReturnType<typeof ownFinding>[]): Reading => ({
  violations: [],
  scoringVersion: SCORING_VERSION,
  audits: { targetSize: { measured: 1, findings } },
});

describe("wcagReadingOf", () => {
  it("fails level A when a keyboard finding blocks the page, like the verdict does", () => {
    const result = onlyOwn([
      ownFinding("unreachable-control", "WCAG 2.1.1 · Keyboard", "critical"),
    ]);
    const scored = withScoring({
      ...result,
      counts: { passed: 10, bestPractice: 0, manualReview: 0 },
    } as unknown as Scorable);

    expect(standingOf(scored.counts)).toBe("blocked");
    expect(wcagReadingOf(result).a).toMatchObject({ fails: true, criteria: [{ sc: "2.1.1" }] });
  });

  it("puts own-rule criteria under the level WCAG gives them", () => {
    const reading = wcagReadingOf(
      onlyOwn([
        ownFinding("focus-order-x", "WCAG 2.4.3 · Focus Order", "serious"),
        ownFinding("live-region-hidden", "WCAG 4.1.3 · Status Messages", "serious"),
        ownFinding("target-size-crowding", "WCAG 2.5.8 · Target Size (Minimum)", "serious"),
      ]),
    );
    expect(reading.a.criteria.map((c) => c.sc)).toEqual(["2.4.3"]);
    expect(reading.aa.criteria.map((c) => c.sc)).toEqual(["2.5.8", "4.1.3"]);
  });

  it("leaves out what needs a human check, as the verdict does", () => {
    const reading = wcagReadingOf(
      onlyOwn([
        ownFinding(
          "live-region-conditional",
          "WCAG 4.1.3 · Status Messages",
          "moderate",
          "heuristic",
        ),
      ]),
    );
    expect(reading.a.fails).toBe(false);
    expect(reading.aa.fails).toBe(false);
  });

  it("does not file a AAA criterion under AA", () => {
    const reading = wcagReadingOf(
      onlyOwn([
        ownFinding("reduced-motion", "WCAG 2.3.3 · Animation from Interactions", "moderate"),
      ]),
    );
    expect(reading.aa.fails).toBe(false);
    expect(reading.a.fails).toBe(false);
  });
});
