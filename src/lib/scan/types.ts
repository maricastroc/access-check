export type Severity = "critical" | "serious" | "moderate" | "minor";

export type ScanViolation = {
  id: string;
  severity: Severity;
  title: string;
  criterion: string;
  where: string;
  desc: string;
  fix: string;
  nodes: number;
};

export type ScanMarker = {
  n: number;
  severity: Severity;
  label: string;
  /** posição em % relativa ao screenshot (0–100) */
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ScanResult = {
  url: string;
  finalUrl: string;
  title: string;
  scannedElements: number;
  durationMs: number;
  /** screenshot acima da dobra, como data URL */
  screenshot: string | null;
  score: number;
  counts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passed: number;
  };
  summary: string;
  violations: ScanViolation[];
  passed: string[];
  markers: ScanMarker[];
  fixFirst: {
    n: string;
    title: string;
    effort: string;
    impact: "High" | "Medium" | "Low";
  }[];
};

export type ScanError = { error: string };
