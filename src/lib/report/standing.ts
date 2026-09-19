import type { ScanResult, Severity } from "@/lib/scan/types";
import { SCORING_VERSION, scoringVersionOf } from "@/lib/scan/scored";
import type { MessageKey } from "@/lib/i18n/t";

export type Standing = "blocked" | "failing" | "gaps" | "clean";

export const STANDING_LABEL: Record<Standing, MessageKey> = {
  blocked: "standing.blocked",
  failing: "standing.failing",
  gaps: "standing.gaps",
  clean: "standing.clean",
};

export const STANDING_NOTE: Record<Standing, MessageKey> = {
  blocked: "standing.blockedNote",
  failing: "standing.failingNote",
  gaps: "standing.gapsNote",
  clean: "standing.cleanNote",
};

export const STANDING_TONE: Record<Standing, string> = {
  blocked: "var(--color-critical)",
  failing: "var(--color-serious)",
  gaps: "var(--color-moderate)",
  clean: "var(--color-verified)",
};

type Counts = ScanResult["counts"];

export function standingOf(counts: Counts): Standing {
  if (counts.critical > 0) return "blocked";
  if (counts.serious > 0) return "failing";
  if (counts.moderate > 0 || counts.minor > 0) return "gaps";
  return "clean";
}

export type CountedSeverity = { severity: Severity; issues: number };

export function countedSeverities(counts: Counts): CountedSeverity[] {
  return (["critical", "serious", "moderate", "minor"] as const)
    .map((severity) => ({ severity, issues: counts[severity] }))
    .filter((row) => row.issues > 0);
}

export function scoringIsCurrent(result: Pick<ScanResult, "scoringVersion">): boolean {
  return scoringVersionOf(result) === SCORING_VERSION;
}
