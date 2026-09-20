import type { KeyboardReport } from "./keyboard";
import type { ContextReport } from "./contexts";
import type { AuditsReport } from "./audits";
import type { ReportLocale } from "../i18n/locale";
import type { ElementIdentity } from "./dom/identity";

export type Severity = "critical" | "serious" | "moderate" | "minor";

export type ScanPhase = "preparing" | "loading" | "auditing" | "processing" | "finalizing";

export type ScanWarningCode =
  | "screenshot-unavailable"
  | "fix-details-skipped"
  | "markers-skipped"
  | "content-unsettled"
  | "verification-skipped"
  | "audits-skipped"
  | "regions-skipped"
  | "reduced-motion-skipped"
  | "keyboard-skipped"
  | "lazy-content-skipped"
  | "walk-changed-page"
  | "contexts-skipped"
  | "stream-interrupted"
  | "cross-origin-assets";

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

export type FixConfidence = "deterministic" | "contextual" | "suggested";

export type EvidenceClass = "deterministic" | "measured" | "heuristic";

export type FixGroup = {
  text: string;
  code?: string;
  count: number;
  selectors: string[];
  confidence?: FixConfidence;
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
  fixConfidence?: FixConfidence;
  nodes: number;
  evidence?: EvidenceClass;
  fixGroups?: FixGroup[];
  verification?: FixVerification;
  contexts?: string[];
};

export const VIEWPORT_CAPTURE = "viewport";

export const SCAN_VIEWPORT = { width: 1200, height: 800 };

export type RegionMiss = "time" | "bytes" | "failed";

export type RegionStop = {
  n: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ScanRegion = {
  id: string;
  docY: number;
  width: number;
  height: number;
  image: string | null;
  missed?: RegionMiss;
  stops: RegionStop[];
};

export type ScanMarker = {
  n: number;
  captureId?: string;
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
  locale?: ReportLocale;
  finalUrl: string;
  title: string;
  scannedElements: number;
  durationMs: number;
  scannedAt?: string;
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
    needsReview?: number;
  };
  summary: string;
  violations: ScanViolation[];
  incomplete: ScanIncomplete[];
  bestPractice: ScanBestPractice[];
  passed: string[];
  markers: ScanMarker[];
  identities?: Record<string, ElementIdentity>;
  regions?: ScanRegion[];
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
  scoringVersion?: number;
};

export type ScanError = { error: string; code?: ScanErrorCode };
