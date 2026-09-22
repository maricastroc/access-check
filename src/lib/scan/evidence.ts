import type { EvidenceClass, ScanViolation } from "./types";

const HEURISTIC_RULES = new Set([
  "focus-order",
  "focus-indicator-unclear",
  "live-region-conditional",
]);

const MEASURED_RULES = new Set([
  "focus-not-visible",
  "keyboard-trap",
  "positive-tabindex",
  "unreachable-control",
  "target-size-crowding",
  "reduced-motion",
  "live-region-invalid",
  "live-region-hidden",
  "live-region-muted",
]);

export function evidenceForRule(id: string): EvidenceClass {
  if (HEURISTIC_RULES.has(id)) return "heuristic";
  if (MEASURED_RULES.has(id)) return "measured";
  return "deterministic";
}

export function evidenceOf(v: Pick<ScanViolation, "id" | "evidence">): EvidenceClass {
  return v.evidence ?? evidenceForRule(v.id);
}

export function needsHumanCheck(v: Pick<ScanViolation, "id" | "evidence">): boolean {
  return evidenceOf(v) === "heuristic";
}

export function chargeable<T extends Pick<ScanViolation, "id" | "evidence">>(violations: T[]): T[] {
  return violations.filter((v) => !needsHumanCheck(v));
}
