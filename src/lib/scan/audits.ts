import type { Severity } from "./types";
import { severityOrder } from "./derive";

/**
 * Shared shape for findings produced by our own detection engine — the checks
 * that go beyond what axe-core reports (target size, reduced motion, live
 * regions). Deliberately mirrors KeyboardFinding so the UI can render every
 * custom finding with one component.
 */
export type AuditFinding = {
  id: string;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  /** How many elements this finding covers. */
  count: number;
  /** Sample of affected selectors (capped so the payload stays small). */
  selectors: string[];
};

/** Per-check reports, all optional so a scan can skip any of them. */
export type AuditsReport = {
  targetSize?: import("./target-size").TargetSizeReport;
  reducedMotion?: import("./reduced-motion").ReducedMotionReport;
  liveRegions?: import("./live-regions").LiveRegionsReport;
};

export const MAX_AUDIT_SELECTORS = 8;

/** Most severe first, matching how axe violations and keyboard findings sort. */
export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
  return [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );
}
