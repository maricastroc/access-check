import type { ScanViolation, Severity } from "@/lib/scan/types";
import { computeScore } from "../scan/derive";
import { SEVERITY_ORDER } from "./severity";

const severityWeight: Record<Severity, number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

const NODE_CAP = 5;

export type ScoreDeduction = {
  severity: Severity;
  issues: number;
  elements: number;
  penalty: number;
  deduction: number;
  ifFixed: number;
  gain: number;
};

export type ScoreBreakdown = {
  base: 100;
  score: number;
  totalDeduction: number;
  deductions: ScoreDeduction[];
};

export function scoreBreakdown(violations: ScanViolation[], score: number): ScoreBreakdown {
  const totalDeduction = Math.max(0, 100 - score);

  const rows = SEVERITY_ORDER.map((severity) => {
    const items = violations.filter((v) => v.severity === severity);
    const elements = items.reduce((sum, v) => sum + v.nodes, 0);
    const penalty = items.reduce(
      (sum, v) => sum + severityWeight[severity] * Math.min(v.nodes, NODE_CAP),
      0,
    );

    const ifFixed = Math.max(
      score,
      computeScore(violations.filter((v) => v.severity !== severity)),
    );
    return { severity, issues: items.length, elements, penalty, ifFixed, gain: ifFixed - score };
  }).filter((r) => r.penalty > 0);

  const penaltySum = rows.reduce((sum, r) => sum + r.penalty, 0);

  const raw = rows.map((r) => (penaltySum > 0 ? (r.penalty / penaltySum) * totalDeduction : 0));
  const floors = raw.map((x) => Math.floor(x));
  let remainder = totalDeduction - floors.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  const deductionByIndex = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    deductionByIndex[i] += 1;
    remainder -= 1;
  }

  const deductions: ScoreDeduction[] = rows.map((r, i) => ({
    ...r,
    deduction: deductionByIndex[i],
  }));

  return { base: 100, score, totalDeduction, deductions };
}
