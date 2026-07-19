import type { Effort, Severity, ScanViolation } from "./types";

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

/** Top issues ordered by severity (and number of occurrences) for the "Fix First" block. */
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

export function buildSummary(counts: {
  critical: number;
  serious: number;
  moderate: number;
}): string {
  if (counts.critical > 0) {
    const n = counts.critical;
    return `Strong foundation, but ${n} critical issue${n > 1 ? "s" : ""} block${n > 1 ? "" : "s"} full AA compliance — resolve ${n > 1 ? "them" : "it"} first.`;
  }
  if (counts.serious > 0) {
    return `No critical blockers, but ${counts.serious} serious issue${counts.serious > 1 ? "s" : ""} still hurt${counts.serious > 1 ? "" : "s"} the experience for assistive tech.`;
  }
  if (counts.moderate > 0) {
    return `Solid result — only moderate refinements left to polish accessibility.`;
  }
  return `Excellent — no automated violations detected on this page.`;
}
