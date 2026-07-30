import type { Severity } from "./types";
import { severityOrder } from "./derive";

export type AuditFinding = {
  id: string;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  count: number;
  selectors: string[];
};

export type AuditsReport = {
  targetSize?: import("./target-size").TargetSizeReport;
  reducedMotion?: import("./reduced-motion").ReducedMotionReport;
  liveRegions?: import("./live-regions").LiveRegionsReport;
};

export const MAX_AUDIT_SELECTORS = 8;

export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
  return [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );
}
