import type { FixVerification, Severity } from "@/lib/scan/types";
import type { MessageKey, Translate } from "@/lib/i18n/t";

export type FixStatus = "verified" | "needs-review" | "unchecked";

export const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

export const SEVERITY_LABEL_KEY: Record<Severity, MessageKey> = {
  critical: "severity.critical",
  serious: "severity.serious",
  moderate: "severity.moderate",
  minor: "severity.minor",
};

export function severityLabel(severity: Severity, t: Translate): string {
  return t(SEVERITY_LABEL_KEY[severity]);
}

export const severityColorVar: Record<Severity, string> = {
  critical: "var(--color-critical)",
  serious: "var(--color-serious)",
  moderate: "var(--color-moderate)",
  minor: "var(--color-muted)",
};

export const severityTextVar: Record<Severity, string> = {
  critical: "var(--color-critical)",
  serious: "var(--color-serious)",
  moderate: "var(--color-moderate-text)",
  minor: "var(--color-muted)",
};

export const severityHatchClass: Record<Severity, string> = {
  critical: "hatch-critical",
  serious: "hatch-serious",
  moderate: "hatch-moderate",
  minor: "",
};

export type SeverityMeta = {
  label: string;
  blocksAA: boolean;
  who: string;
  short: string;
};

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  critical: {
    label: "Critical",
    blocksAA: true,
    who: "severity.criticalDesc",
    short: "blocks access",
  },
  serious: {
    label: "Serious",
    blocksAA: true,
    who: "severity.seriousDesc",
    short: "major barrier",
  },
  moderate: {
    label: "Moderate",
    blocksAA: false,
    who: "severity.moderateDesc",
    short: "adds friction",
  },
  minor: {
    label: "Minor",
    blocksAA: false,
    who: "severity.minorDesc",
    short: "polish",
  },
};

export function toFixStatus(v: FixVerification | undefined): FixStatus {
  if (v === "verified") return "verified";
  if (v === "failed") return "needs-review";
  return "unchecked";
}
