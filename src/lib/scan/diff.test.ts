import { describe, it, expect } from "vitest";
import { diffScans } from "./diff";
import { SCORING_VERSION } from "./scored";
import type { ScanResult, ScanViolation, Severity } from "./types";

function violation(id: string, severity: Severity, title = id): ScanViolation {
  return { id, severity, title, criterion: "", where: "", desc: "", fix: "", nodes: 1 };
}

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "https://x.com",
    finalUrl: "https://x.com",
    title: "x",
    scannedElements: 0,
    durationMs: 0,
    screenshot: null,
    score: 0,
    counts: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 0,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "",
    violations: [],
    incomplete: [] as import("./types").ScanIncomplete[],
    bestPractice: [] as import("./types").ScanBestPractice[],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

describe("diffScans", () => {
  it("detects fixed and regressed rules by id", () => {
    const prev = result({
      violations: [violation("color-contrast", "serious"), violation("button-name", "critical")],
    });
    const curr = result({
      violations: [violation("button-name", "critical"), violation("image-alt", "critical")],
    });

    const d = diffScans(prev, curr);
    expect(d.fixed.map((f) => f.id)).toEqual(["color-contrast"]);
    expect(d.regressed.map((r) => r.id)).toEqual(["image-alt"]);
  });

  it("computes score and count deltas", () => {
    const prev = result({
      score: 70,
      counts: {
        critical: 2,
        serious: 1,
        moderate: 0,
        minor: 0,
        passed: 10,
        bestPractice: 0,
        manualReview: 0,
      },
    });
    const curr = result({
      score: 85,
      counts: {
        critical: 0,
        serious: 1,
        moderate: 0,
        minor: 0,
        passed: 14,
        bestPractice: 0,
        manualReview: 0,
      },
    });

    const d = diffScans(prev, curr);
    expect(d.scoreDelta).toBe(15);
    expect(d.counts.critical).toEqual({ from: 2, to: 0, delta: -2 });
    expect(d.counts.passed.delta).toBe(4);
  });

  it("sorts fixed/regressed by severity", () => {
    const prev = result({
      violations: [violation("a", "minor"), violation("b", "critical")],
    });
    const curr = result({});

    const d = diffScans(prev, curr);
    expect(d.fixed.map((f) => f.severity)).toEqual(["critical", "minor"]);
  });

  it("no changes in the rules → fixed and regressed empty", () => {
    const prev = result({ violations: [violation("color-contrast", "serious")] });
    const curr = result({ violations: [violation("color-contrast", "serious")] });

    const d = diffScans(prev, curr);
    expect(d.fixed).toEqual([]);
    expect(d.regressed).toEqual([]);
  });
});

describe("diffScans across scoring models", () => {
  const v1 = (score: number, violations = [violation("label", "critical")]) =>
    result({ score, violations });
  const v2 = (score: number, violations = [violation("label", "critical")]) =>
    result({ score, violations, scoringVersion: SCORING_VERSION });

  it("compares two readings from the legacy model", () => {
    const diff = diffScans(v1(60), v1(80));

    expect(diff.comparable).toBe(true);
    expect(diff.scoringFrom).toBe(1);
    expect(diff.scoreDelta).toBe(20);
  });

  it("compares two readings from the current model", () => {
    const diff = diffScans(v2(60), v2(80));

    expect(diff.comparable).toBe(true);
    expect(diff.scoringTo).toBe(SCORING_VERSION);
    expect(diff.scoreDelta).toBe(20);
  });

  it("refuses to call a change across models a rise or a fall", () => {
    const diff = diffScans(v1(100), v2(24));

    expect(diff.comparable).toBe(false);
    expect(diff.scoringFrom).toBe(1);
    expect(diff.scoringTo).toBe(SCORING_VERSION);
  });

  it("reads a stored result with no version as legacy", () => {
    const stored = JSON.parse(JSON.stringify(v1(100))) as ScanResult;

    expect(stored.scoringVersion).toBeUndefined();
    expect(diffScans(stored, v2(24)).comparable).toBe(false);
    expect(diffScans(stored, stored).comparable).toBe(true);
  });

  it("still says which rules were fixed and which regressed across models", () => {
    const before = v1(100, [violation("label", "critical"), violation("image-alt", "serious")]);
    const after = v2(24, [violation("image-alt", "serious"), violation("target-size", "serious")]);

    const diff = diffScans(before, after);

    expect(diff.comparable).toBe(false);
    expect(diff.fixed.map((f) => f.id)).toEqual(["label"]);
    expect(diff.regressed.map((f) => f.id)).toEqual(["target-size"]);
  });
});
