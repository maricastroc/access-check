import type { Severity } from "@/lib/scan/types";

export const sevDot: Record<Severity, string> = {
  critical: "bg-critical",
  serious: "bg-serious",
  moderate: "bg-moderate",
  minor: "bg-faint",
};

export const sevText: Record<Severity, string> = {
  critical: "text-critical",
  serious: "text-serious",
  moderate: "text-moderate",
  minor: "text-faint",
};

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

export const severityOrder: Severity[] = ["critical", "serious", "moderate", "minor"];
