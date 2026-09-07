import type { Effort, ScanResult, Severity, ScanViolation } from "./types";

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

function remaining(bestPractice: number, manualReview: number): string {
  const parts: string[] = [];
  if (bestPractice > 0) {
    parts.push(`${bestPractice} best-practice recommendation${bestPractice === 1 ? "" : "s"}`);
  }
  if (manualReview > 0) {
    parts.push(`${manualReview} manual-review item${manualReview === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return "";

  const single = parts.length === 1 && (bestPractice === 1 || manualReview === 1);
  return ` ${parts.join(" and ")} ${single ? "remains" : "remain"}, outside the score.`;
}

export function buildSummary(
  counts: {
    critical: number;
    serious: number;
    moderate: number;
    bestPractice?: number;
    manualReview?: number;
  },
  options: { partial?: boolean } = {},
): string {
  const scope = options.partial ? " among the checks that ran" : "";
  const tail = remaining(counts.bestPractice ?? 0, counts.manualReview ?? 0);

  if (counts.critical > 0) {
    const n = counts.critical;
    return `Strong foundation, but ${n} critical finding${n > 1 ? "s" : ""} block${n > 1 ? "" : "s"} WCAG level AA. Fix ${n > 1 ? "them" : "it"} first.${tail}`;
  }
  if (counts.serious > 0) {
    const n = counts.serious;
    return `No critical blockers${scope}, but ${n} serious finding${n > 1 ? "s" : ""} still ${n > 1 ? "make" : "makes"} the page harder to use for people who rely on assistive technology.${tail}`;
  }
  if (counts.moderate > 0) {
    return options.partial
      ? `Only moderate findings among the checks that ran.${tail}`
      : `Solid result. Only moderate findings are left to polish.${tail}`;
  }

  const clean = options.partial
    ? `No scored WCAG failures in the checks that ran. Some checks did not run here, so this is not a clean bill of health.`
    : tail
      ? `No scored WCAG failures were found.`
      : `Excellent. No automated findings on this page.`;

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
