import type { FixVerification, Severity } from "@/lib/scan/types";

export type FixStatus = "verified" | "needs-review" | "unchecked";

export const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

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
    who: "Blocks access outright for some assistive-tech users.",
    short: "blocks access",
  },
  serious: {
    label: "Serious",
    blocksAA: true,
    who: "Major barrier. Many people can't complete the task.",
    short: "major barrier",
  },
  moderate: {
    label: "Moderate",
    blocksAA: false,
    who: "Noticeable friction, but the task stays possible.",
    short: "adds friction",
  },
  minor: {
    label: "Minor",
    blocksAA: false,
    who: "Small polish item with limited impact.",
    short: "polish",
  },
};

export function toFixStatus(v: FixVerification | undefined): FixStatus {
  if (v === "verified") return "verified";
  if (v === "failed") return "needs-review";
  return "unchecked";
}
