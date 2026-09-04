import type { ScanViolation, Severity } from "@/lib/scan/types";
import { computeScore } from "../scan/derive";
import { SEVERITY_ORDER } from "./severity";

/**
 * The internal priority score is computed by the engine (src/lib/scan/derive.ts)
 * with a non-linear damped penalty: score = round(100 · e^(-penalty/45)), where
 * penalty = Σ weight[severity] · min(nodes, 5). Because the mapping from penalty
 * to score is non-linear, per-severity effects do NOT add up linearly.
 *
 * This helper never invents a second scoring model. It takes the engine's
 * authoritative `score` and, for each severity, reports the score the page would
 * actually reach if every finding of that severity were fixed, projected with the
 * engine's own `computeScore`. That "if fixed" value is the honest, actionable
 * number (what removing that severity really recovers), unlike a proportional
 * "minus N points" split, which reads as additive when the score is not.
 *
 * `deduction` (a proportional share of 100 − score) is kept only to size the
 * severity segments on the visual ruler; it is never presented as points.
 */

const severityWeight: Record<Severity, number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

const NODE_CAP = 5;

export type ScoreDeduction = {
  severity: Severity;
  issues: number; // count of violations of this severity
  elements: number; // sum of affected nodes
  penalty: number; // weight · Σ min(nodes, cap) — the engine's penalty input
  deduction: number; // integer share of (100 − score); used only for ruler segment widths
  ifFixed: number; // score the page would reach if every finding of this severity were fixed
  gain: number; // ifFixed − score (≥ 0): points recovered by fixing this severity
};

export type ScoreBreakdown = {
  base: 100;
  score: number;
  totalDeduction: number; // 100 − score (≥ 0)
  deductions: ScoreDeduction[]; // severities with penalty > 0, in SEVERITY_ORDER
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
    // Project the score with every finding of this severity removed, using the
    // engine's own formula. Clamp so a projection never dips below the current
    // score (matches the priority-projection on the report's progress page).
    const ifFixed = Math.max(score, computeScore(violations.filter((v) => v.severity !== severity)));
    return { severity, issues: items.length, elements, penalty, ifFixed, gain: ifFixed - score };
  }).filter((r) => r.penalty > 0);

  const penaltySum = rows.reduce((sum, r) => sum + r.penalty, 0);

  // Largest-remainder apportionment of `totalDeduction` across rows by penalty share.
  const raw = rows.map((r) => (penaltySum > 0 ? (r.penalty / penaltySum) * totalDeduction : 0));
  const floors = raw.map((x) => Math.floor(x));
  let remainder = totalDeduction - floors.reduce((s, x) => s + x, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
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
