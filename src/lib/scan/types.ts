import type { KeyboardReport } from "./keyboard";
import type { ContextReport } from "./contexts";

export type Severity = "critical" | "serious" | "moderate" | "minor";

// Esforço qualitativo pro bloco "Fix First" — sem falsa precisão de minutos.
export type Effort = "Quick" | "Moderate" | "Involved";

// "verified" = a regra parou de falhar após aplicar o fix; "failed" = o axe
// ainda acusa; "unchecked" = fix sem mutação auto-aplicável.
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
  // Opcionais: scans antigos em cache/histórico não têm estes campos.
  keyboard?: KeyboardReport;
  contexts?: ContextReport;
  fixFirst: {
    n: string;
    title: string;
    effort: Effort;
    impact: "High" | "Medium" | "Low";
  }[];
  // true quando a página era grande demais e os passes extras (verificação,
  // teclado, contextos) foram pulados pra devolver o core do axe dentro do tempo.
  partial?: boolean;
};

export type ScanError = { error: string };
