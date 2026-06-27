import { describe, it, expect } from "vitest";
import { diffScans } from "./diff";
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
    counts: { critical: 0, serious: 0, moderate: 0, minor: 0, passed: 0 },
    summary: "",
    violations: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

describe("diffScans", () => {
  it("detecta regras consertadas e regredidas por id", () => {
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

  it("calcula deltas de score e de contagem", () => {
    const prev = result({
      score: 70,
      counts: { critical: 2, serious: 1, moderate: 0, minor: 0, passed: 10 },
    });
    const curr = result({
      score: 85,
      counts: { critical: 0, serious: 1, moderate: 0, minor: 0, passed: 14 },
    });

    const d = diffScans(prev, curr);
    expect(d.scoreDelta).toBe(15);
    expect(d.counts.critical).toEqual({ from: 2, to: 0, delta: -2 });
    expect(d.counts.passed.delta).toBe(4);
  });

  it("ordena consertadas/regredidas por severidade", () => {
    const prev = result({
      violations: [violation("a", "minor"), violation("b", "critical")],
    });
    const curr = result({});

    const d = diffScans(prev, curr);
    expect(d.fixed.map((f) => f.severity)).toEqual(["critical", "minor"]);
  });

  it("sem mudanças nas regras → fixed e regressed vazios", () => {
    const prev = result({ violations: [violation("color-contrast", "serious")] });
    const curr = result({ violations: [violation("color-contrast", "serious")] });

    const d = diffScans(prev, curr);
    expect(d.fixed).toEqual([]);
    expect(d.regressed).toEqual([]);
  });
});
