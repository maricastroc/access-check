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
    return `Strong foundation, but ${n} critical finding${n > 1 ? "s" : ""} block${n > 1 ? "" : "s"} WCAG level AA. Fix ${n > 1 ? "them" : "it"} first.`;
  }
  if (counts.serious > 0) {
    const n = counts.serious;
    return `No critical blockers, but ${n} serious finding${n > 1 ? "s" : ""} still ${n > 1 ? "make" : "makes"} the page harder to use for people who rely on assistive technology.`;
  }
  if (counts.moderate > 0) {
    return `Solid result. Only moderate findings are left to polish.`;
  }
  return `Excellent. No automated findings on this page.`;
}
