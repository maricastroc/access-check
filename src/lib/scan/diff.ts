import type { ScanResult, ScanViolation, Severity } from "./types";

export type ViolationRef = { id: string; title: string; severity: Severity };

export type CountKey = Severity | "passed";

export type ScanDiff = {
  scoreFrom: number;
  scoreTo: number;
  scoreDelta: number;
  counts: Record<CountKey, { from: number; to: number; delta: number }>;
  fixed: ViolationRef[];
  regressed: ViolationRef[];
};

const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

function toRef(v: ScanViolation): ViolationRef {
  return { id: v.id, title: v.title, severity: v.severity };
}

function bySeverity(a: ViolationRef, b: ViolationRef): number {
  return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
}

export function diffScans(prev: ScanResult, curr: ScanResult): ScanDiff {
  const prevIds = new Set(prev.violations.map((v) => v.id));
  const currIds = new Set(curr.violations.map((v) => v.id));

  const fixed = prev.violations
    .filter((v) => !currIds.has(v.id))
    .map(toRef)
    .sort(bySeverity);
  const regressed = curr.violations
    .filter((v) => !prevIds.has(v.id))
    .map(toRef)
    .sort(bySeverity);

  const keys: CountKey[] = [...SEVERITY_ORDER, "passed"];
  const counts = Object.fromEntries(
    keys.map((k) => {
      const from = prev.counts[k];
      const to = curr.counts[k];
      return [k, { from, to, delta: to - from }];
    }),
  ) as Record<CountKey, { from: number; to: number; delta: number }>;

  return {
    scoreFrom: prev.score,
    scoreTo: curr.score,
    scoreDelta: curr.score - prev.score,
    counts,
    fixed,
    regressed,
  };
}
