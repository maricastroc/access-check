import type { Effort, ScanResult, Severity, ScanViolation } from "./types";
import type { Translate } from "../i18n/t";

const severityWeight: Record<Severity, number> = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

export const severityOrder: Severity[] = ["critical", "serious", "moderate", "minor"];

export function computeScore(violations: ScanViolation[]): number {
  const penalty = violations.reduce(
    (sum, v) => sum + severityWeight[v.severity] * Math.min(v.nodes, 5),
    0,
  );

  const damped = 100 - 100 * (1 - Math.exp(-penalty / 45));
  return Math.max(0, Math.round(damped));
}

function estimateEffort(id: string): Effort {
  if (/contrast/.test(id)) return "Quick";
  if (/label|alt|name|aria|autocomplete/.test(id)) return "Moderate";
  return "Involved";
}

function impactFromSeverity(s: Severity): "High" | "Medium" | "Low" {
  if (s === "critical" || s === "serious") return "High";
  if (s === "moderate") return "Medium";
  return "Low";
}

export function buildFixFirst(violations: ScanViolation[]) {
  const ranked = [...violations].sort((a, b) => {
    const sa = severityOrder.indexOf(a.severity);
    const sb = severityOrder.indexOf(b.severity);
    if (sa !== sb) return sa - sb;
    return b.nodes - a.nodes;
  });

  return ranked.slice(0, 4).map((v, i) => ({
    n: String(i + 1).padStart(2, "0"),
    title: v.title,
    effort: estimateEffort(v.id),
    impact: impactFromSeverity(v.severity),
  }));
}

function remaining(bestPractice: number, manualReview: number, t: Translate): string {
  const parts: string[] = [];
  if (bestPractice > 0) parts.push(t("summary.bestPractice", { count: bestPractice }));
  if (manualReview > 0) parts.push(t("summary.manualReview", { count: manualReview }));
  if (parts.length === 0) return "";

  const single = parts.length === 1 && (bestPractice === 1 || manualReview === 1);
  return t("summary.remaining", {
    count: single ? 1 : 2,
    parts: parts.join(` ${t("unit.and")} `),
  });
}

export function buildSummary(
  counts: {
    critical: number;
    serious: number;
    moderate: number;
    bestPractice?: number;
    manualReview?: number;
  },
  t: Translate,
  options: { partial?: boolean } = {},
): string {
  const scope = options.partial ? t("summary.scope") : "";
  const tail = remaining(counts.bestPractice ?? 0, counts.manualReview ?? 0, t);

  if (counts.critical > 0) {
    return `${t("summary.critical", { count: counts.critical })}${tail}`;
  }
  if (counts.serious > 0) {
    return `${t("summary.serious", { count: counts.serious, scope })}${tail}`;
  }
  if (counts.moderate > 0) {
    const line = options.partial ? t("summary.moderatePartial") : t("summary.moderate");
    return `${line}${tail}`;
  }

  const clean = options.partial
    ? t("summary.cleanPartial")
    : tail
      ? t("summary.cleanNoFailures")
      : t("summary.excellent");

  return `${clean}${tail}`;
}

export function buildCounts(
  violations: ScanViolation[],
  totals: { passed: number; bestPractice: number; manualReview: number },
): ScanResult["counts"] {
  return {
    critical: violations.filter((v) => v.severity === "critical").length,
    serious: violations.filter((v) => v.severity === "serious").length,
    moderate: violations.filter((v) => v.severity === "moderate").length,
    minor: violations.filter((v) => v.severity === "minor").length,
    passed: totals.passed,
    bestPractice: totals.bestPractice,
    manualReview: totals.manualReview,
  };
}
