import type { FixConfidence, FixGroup, FixVerification, ScanViolation } from "./types";

function storedBeforeConfidence(ruleId: string, code: string | undefined): FixConfidence | null {
  if (!code) return null;
  return ruleId === "color-contrast" ? "deterministic" : "suggested";
}

export function fixConfidenceOf(
  v: Pick<ScanViolation, "id" | "fixCode" | "fixConfidence">,
): FixConfidence | null {
  return v.fixConfidence ?? storedBeforeConfidence(v.id, v.fixCode);
}

export function groupConfidenceOf(g: FixGroup, ruleId: string): FixConfidence | null {
  return g.confidence ?? storedBeforeConfidence(ruleId, g.code);
}

export function certifiedVerification(
  confidence: FixConfidence | null,
  verification: FixVerification | undefined,
): FixVerification {
  return confidence === "deterministic" ? (verification ?? "unchecked") : "unchecked";
}
