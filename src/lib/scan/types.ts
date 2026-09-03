import type { KeyboardReport } from "./keyboard";
import type { ContextReport } from "./contexts";
import type { AuditsReport } from "./audits";

export type Severity = "critical" | "serious" | "moderate" | "minor";

export type ScanPhase = "preparing" | "loading" | "auditing" | "processing" | "finalizing";

export type ScanWarningCode =
  | "screenshot-unavailable"
  | "fix-details-skipped"
  | "markers-skipped"
  | "content-unsettled"
  | "verification-skipped"
  | "audits-skipped"
  | "keyboard-skipped"
  | "contexts-skipped"
  | "stream-interrupted";

export type ScanWarning = { code: ScanWarningCode; message: string };

export type ScanErrorCode =
  | "invalid-url"
  | "blocked-url"
  | "rate-limited"
  | "navigation-timeout"
  | "navigation-failed"
  | "http-error"
  | "audit-failed"
  | "browser-unavailable"
  | "timeout"
  | "interrupted"
  | "internal";

export type Effort = "Quick" | "Moderate" | "Involved";

export type FixVerification = "verified" | "failed" | "unchecked";

export type FixGroup = {
  text: string;
  code?: string;
  count: number;
  selectors: string[];
  verification: FixVerification;
};

export type ScanViolation = {
  id: string;
  severity: Severity;
  title: string;
  criterion: string;
  where: string;
  desc: string;
  fix: string;
  fixCode?: string;
  nodes: number;
  fixGroups?: FixGroup[];
  verification?: FixVerification;
};

export type ScanMarker = {
  n: number;
  severity: Severity;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ScanIncomplete = {
  id: string;
  title: string;
  desc: string;
  nodes: number;
  criterion: string;
  selectors: string[];
};

export type ScanBestPractice = {
  id: string;
  title: string;
  desc: string;
  nodes: number;
  selectors: string[];
};

export type ScanResult = {
  url: string;
  finalUrl: string;
  title: string;
  scannedElements: number;
  durationMs: number;
  screenshot: string | null;
  score: number;
  counts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passed: number;
    bestPractice: number;
    manualReview: number;
  };
  summary: string;
  violations: ScanViolation[];
  incomplete: ScanIncomplete[];
  bestPractice: ScanBestPractice[];
  passed: string[];
  markers: ScanMarker[];
  keyboard?: KeyboardReport;
  contexts?: ContextReport;
  audits?: AuditsReport;
  fixFirst: {
    n: string;
    title: string;
    effort: Effort;
    impact: "High" | "Medium" | "Low";
  }[];
  partial?: boolean;
  warnings?: ScanWarning[];
};

export type ScanError = { error: string; code?: ScanErrorCode };
