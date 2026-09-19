import { describe, expect, it } from "vitest";
import { countedSeverities, scoringIsCurrent, standingOf } from "./standing";
import { scoreBreakdown } from "./score";
import { buildReportMarkdown } from "./markdown";
import { computeScore } from "@/lib/scan/derive";
import { SCORING_VERSION } from "@/lib/scan/scored";
import { evidenceOf } from "@/lib/scan/evidence";
import type { ScanResult, ScanViolation, Severity } from "@/lib/scan/types";

const counts = (over: Partial<ScanResult["counts"]> = {}): ScanResult["counts"] => ({
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 0,
  passed: 40,
  bestPractice: 0,
  manualReview: 0,
  ...over,
});

function violation(
  id: string,
  severity: Severity,
  nodes: number,
  heuristic = false,
): ScanViolation {
  return {
    id,
    severity,
    title: `${id} failed`,
    criterion: "WCAG 1.4.3 · Contrast (Minimum)",
    where: ".x",
    desc: "d",
    fix: "f",
    nodes,
    evidence: heuristic ? "heuristic" : "deterministic",
  };
}

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://example.com",
    title: "Example",
    scannedElements: 50,
    durationMs: 1000,
    scoringVersion: SCORING_VERSION,
    screenshot: null,
    score: 60,
    counts: counts({ serious: 1 }),
    summary: "s",
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

describe("where a page stands, read without a number", () => {
  it("is blocked by anything critical", () => {
    expect(standingOf(counts({ critical: 1, serious: 4 }))).toBe("blocked");
  });

  it("is failing when the worst is serious", () => {
    expect(standingOf(counts({ serious: 1 }))).toBe("failing");
  });

  it("has minor gaps when only the small ones are left", () => {
    expect(standingOf(counts({ moderate: 2 }))).toBe("gaps");
    expect(standingOf(counts({ minor: 1 }))).toBe("gaps");
  });

  it("has no automated failures when nothing is charged", () => {
    expect(standingOf(counts({ manualReview: 4, bestPractice: 2 }))).toBe("clean");
  });

  it("does not move because something needs a human check", () => {
    expect(standingOf(counts({ needsReview: 3 }))).toBe("clean");
  });

  it("lists only the severities that actually have findings", () => {
    expect(countedSeverities(counts({ critical: 1, moderate: 2 }))).toEqual([
      { severity: "critical", issues: 1 },
      { severity: "moderate", issues: 2 },
    ]);
  });
});

describe("the priority list stays actionable without quoting a grade", () => {
  const charged = [
    violation("color-contrast", "serious", 5),
    violation("heading-order", "moderate", 2),
  ];
  const withGuess = [...charged, violation("focus-order", "moderate", 9, true)];

  it("shares add up to the whole of what is left", () => {
    const breakdown = scoreBreakdown(charged, computeScore(charged));
    expect(breakdown.deductions.reduce((sum, d) => sum + d.share, 0)).toBe(100);
  });

  it("orders the heaviest group first", () => {
    const breakdown = scoreBreakdown(charged, computeScore(charged));
    expect(breakdown.deductions[0].severity).toBe("serious");
    expect(breakdown.deductions[0].share).toBeGreaterThan(breakdown.deductions[1].share);
  });

  it("keeps the recovery it always offered", () => {
    const breakdown = scoreBreakdown(charged, computeScore(charged));
    expect(breakdown.deductions[0].ifFixed).toBeGreaterThan(computeScore(charged));
    expect(breakdown.deductions[0].gain).toBeGreaterThan(0);
  });

  it("never gives a row to evidence that is not charged", () => {
    const breakdown = scoreBreakdown(withGuess, computeScore(withGuess));
    const rows = breakdown.deductions.map((d) => d.severity);

    expect(scoreBreakdown(charged, computeScore(charged)).deductions).toEqual(breakdown.deductions);
    expect(rows).toEqual(["serious", "moderate"]);
    expect(withGuess.filter((v) => evidenceOf(v) === "heuristic")).toHaveLength(1);
  });
});

describe("a reading produced by an older model", () => {
  it("is recognised as such", () => {
    expect(scoringIsCurrent(result({ scoringVersion: SCORING_VERSION }))).toBe(true);
    expect(scoringIsCurrent(result({ scoringVersion: SCORING_VERSION - 1 }))).toBe(false);
    expect(scoringIsCurrent(result({ scoringVersion: undefined }))).toBe(false);
  });

  it("says so in the exported report", () => {
    const stale = buildReportMarkdown(
      result({ scoringVersion: 1, violations: [violation("color-contrast", "serious", 3)] }),
    );
    const fresh = buildReportMarkdown(
      result({ violations: [violation("color-contrast", "serious", 3)] }),
    );

    expect(stale).toContain("earlier scoring model");
    expect(fresh).not.toContain("earlier scoring model");
  });

  it("leads the export with the standing, not with a number out of a hundred", () => {
    const md = buildReportMarkdown(
      result({ violations: [violation("color-contrast", "serious", 3)] }),
    );

    expect(md).toContain("Where this page stands");
    expect(md).toContain("Failing");
    expect(md).not.toMatch(/\d+ \/ 100/);
    expect(md).not.toContain("Internal priority score");
  });
});
