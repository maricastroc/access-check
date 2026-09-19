import { describe, expect, it } from "vitest";
import { buildCounts, buildFixFirst, computeScore } from "./derive";
import { chargeable, evidenceForRule, evidenceOf, needsHumanCheck } from "./evidence";
import { scoredViolations } from "./scored";
import type { EvidenceClass, ScanResult, ScanViolation, Severity } from "./types";

function violation(
  id: string,
  severity: Severity,
  nodes: number,
  evidence?: EvidenceClass,
): ScanViolation {
  return {
    id,
    severity,
    title: `${id} failed`,
    criterion: "WCAG 2.4.3 · Focus Order",
    where: ".somewhere",
    desc: "desc",
    fix: "fix",
    nodes,
    ...(evidence ? { evidence } : null),
  };
}

const TOTALS = { passed: 40, bestPractice: 1, manualReview: 2 };

describe("what kind of evidence a finding rests on", () => {
  it("reads the class the scan recorded", () => {
    expect(evidenceOf(violation("color-contrast", "serious", 1, "heuristic"))).toBe("heuristic");
  });

  it("derives it from the rule when a stored scan predates the field", () => {
    expect(evidenceOf({ id: "focus-order" })).toBe("heuristic");
    expect(evidenceOf({ id: "focus-not-visible" })).toBe("measured");
    expect(evidenceOf({ id: "color-contrast" })).toBe("deterministic");
  });

  it("treats a rule it has never seen as an objective failure", () => {
    expect(evidenceForRule("some-future-axe-rule")).toBe("deterministic");
  });

  it("only the reading-order guess needs a human", () => {
    expect(needsHumanCheck({ id: "focus-order" })).toBe(true);
    expect(needsHumanCheck({ id: "keyboard-trap" })).toBe(false);
    expect(needsHumanCheck({ id: "unreachable-control" })).toBe(false);
  });
});

describe("what a heuristic finding is allowed to move", () => {
  const solid = [violation("color-contrast", "serious", 5), violation("image-alt", "critical", 2)];
  const guess = violation("focus-order", "moderate", 4, "heuristic");

  it("never changes the score, whether it is there or not", () => {
    expect(computeScore([...solid, guess])).toBe(computeScore(solid));
  });

  it("does not change it for a stored scan that has no evidence field either", () => {
    const stored = violation("focus-order", "moderate", 4);
    expect(stored.evidence).toBeUndefined();
    expect(computeScore([...solid, stored])).toBe(computeScore(solid));
  });

  it("cannot drag a clean page below a hundred on its own", () => {
    expect(computeScore([guess])).toBe(100);
  });

  it("stays out of the Fix First list", () => {
    const fixFirst = buildFixFirst([
      ...solid,
      violation("focus-order", "critical", 9, "heuristic"),
    ]);
    expect(fixFirst.map((f) => f.title)).not.toContain("focus-order failed");
  });

  it("is counted apart from the failures, not among them", () => {
    const counts = buildCounts([...solid, guess], TOTALS);

    expect(counts.serious).toBe(1);
    expect(counts.critical).toBe(1);
    expect(counts.moderate).toBe(0);
    expect(counts.needsReview).toBe(1);
  });

  it("is still handed to the report, just not to the arithmetic", () => {
    expect(chargeable([...solid, guess])).toHaveLength(2);
    expect([...solid, guess]).toHaveLength(3);
  });
});

describe("the classes a whole scan comes out with", () => {
  const result: Pick<ScanResult, "violations" | "keyboard" | "audits" | "contexts"> = {
    violations: [violation("color-contrast", "serious", 3, "deterministic")],
    keyboard: {
      totalStops: 12,
      totalInteractive: 12,
      reachableInteractive: 12,
      truncated: false,
      cycleComplete: true,
      startedAtTop: true,
      stoppedBy: "cycle",
      focusPath: [],
      findings: [
        {
          id: "focus-order",
          severity: "moderate",
          evidence: "heuristic",
          criterion: "WCAG 2.4.3 · Focus Order",
          title: "Focus order jumps out of sequence 2 times",
          desc: "desc",
          fix: "fix",
          count: 2,
          selectors: [".a"],
          occurrences: [],
        },
        {
          id: "focus-not-visible",
          severity: "serious",
          evidence: "measured",
          criterion: "WCAG 2.4.7 · Focus Visible",
          title: "3 stops show no focus indicator",
          desc: "desc",
          fix: "fix",
          count: 3,
          selectors: [".b"],
          occurrences: [],
        },
      ],
    },
  };

  it("carries the class from the pass that produced each finding", () => {
    const byId = new Map(scoredViolations(result).map((v) => [v.id, evidenceOf(v)]));

    expect(byId.get("color-contrast")).toBe("deterministic");
    expect(byId.get("focus-not-visible")).toBe("measured");
    expect(byId.get("focus-order")).toBe("heuristic");
  });

  it("scores the measured pass but not the guess", () => {
    const scored = scoredViolations(result);
    const withoutGuess = scored.filter((v) => v.id !== "focus-order");

    expect(computeScore(scored)).toBe(computeScore(withoutGuess));
    expect(computeScore(scored)).toBeLessThan(computeScore([]));
  });
});
