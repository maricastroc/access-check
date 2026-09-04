import { describe, expect, it } from "vitest";
import type { ScanViolation } from "@/lib/scan/types";
import { scoreBreakdown } from "./score";

function v(severity: ScanViolation["severity"], nodes: number): ScanViolation {
  return {
    id: `${severity}-${nodes}`,
    severity,
    title: "t",
    criterion: "WCAG 1.4.3 · Contrast (Minimum)",
    where: "a",
    desc: "d",
    fix: "f",
    nodes,
  };
}

describe("scoreBreakdown", () => {
  it("uses the engine score verbatim and totals 100 − score", () => {
    const b = scoreBreakdown([v("serious", 7), v("moderate", 2)], 71);
    expect(b.base).toBe(100);
    expect(b.score).toBe(71);
    expect(b.totalDeduction).toBe(29);
  });

  it("per-severity deductions sum exactly to the total deduction", () => {
    const b = scoreBreakdown(
      [v("critical", 3), v("serious", 7), v("moderate", 4), v("minor", 9)],
      42,
    );
    const sum = b.deductions.reduce((s, d) => s + d.deduction, 0);
    expect(sum).toBe(b.totalDeduction);
    expect(b.deductions.every((d) => Number.isInteger(d.deduction))).toBe(true);
  });

  it("reports penalty, issue and element counts per severity", () => {
    const b = scoreBreakdown([v("serious", 7), v("serious", 1)], 60);
    const serious = b.deductions.find((d) => d.severity === "serious")!;
    expect(serious.issues).toBe(2);
    expect(serious.elements).toBe(8);
    expect(serious.penalty).toBe(30);
  });

  it("orders deductions by severity and drops zero-penalty rows", () => {
    const b = scoreBreakdown([v("moderate", 1), v("critical", 1)], 80);
    expect(b.deductions.map((d) => d.severity)).toEqual(["critical", "moderate"]);
    expect(b.deductions.some((d) => d.severity === "serious")).toBe(false);
  });

  it("has no deductions at a perfect score", () => {
    const b = scoreBreakdown([], 100);
    expect(b.totalDeduction).toBe(0);
    expect(b.deductions).toEqual([]);
  });

  it("attributes more of the deduction to the heavier severity", () => {
    const b = scoreBreakdown([v("critical", 5), v("minor", 1)], 30);
    const crit = b.deductions.find((d) => d.severity === "critical")!;
    const minor = b.deductions.find((d) => d.severity === "minor")!;
    expect(crit.deduction).toBeGreaterThan(minor.deduction);
  });

  it("projects the real score each severity would reach if fixed, and it does NOT add up", () => {
    const b = scoreBreakdown([v("critical", 1), v("serious", 3)], 57);
    const crit = b.deductions.find((d) => d.severity === "critical")!;
    const ser = b.deductions.find((d) => d.severity === "serious")!;
    expect(crit.ifFixed).toBe(72);
    expect(crit.gain).toBe(15);
    expect(ser.ifFixed).toBe(80);
    expect(ser.gain).toBe(23);

    expect(crit.gain + ser.gain).not.toBe(b.totalDeduction);
  });

  it("never projects a score below the current one (clamped)", () => {
    const b = scoreBreakdown([v("moderate", 1)], 99);
    const mod = b.deductions.find((d) => d.severity === "moderate")!;
    expect(mod.ifFixed).toBeGreaterThanOrEqual(99);
    expect(mod.gain).toBeGreaterThanOrEqual(0);
  });
});
