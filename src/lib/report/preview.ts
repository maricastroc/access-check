import type { ContrastMeasurement } from "./contrast";
import type { VerdictKind } from "./verdict";

/**
 * The "Original | Simulated fix" preview model for text-contrast findings.
 *
 * It only ever uses colors the engine actually resolved (original text color,
 * sampled background, and the engine's minimal hue-preserving suggestion that
 * reaches this element's own threshold). It never claims a fix is applied to the
 * site. Confidence is graded honestly:
 *   verified     → a real sandbox re-audit confirmed the rule stopped flagging;
 *   calculated   → the known values reach the minimum, but it wasn't re-audited;
 *   inconclusive → the live re-audit still flags (background is likely an image/
 *                  gradient/overlay) or no color change clears the pair.
 */

export type PreviewConfidence = "verified" | "calculated" | "inconclusive";

export type ContrastPreview = {
  prop: "color" | "background";
  original: { fg: string; bg: string; ratio: number };
  simulated: { fg: string; bg: string; ratio: number };
  required: number;
  passesCalc: boolean;
  confidence: PreviewConfidence;
  reason?: string;
  originalValue: string;
  suggestedValue: string;
  shared: boolean;
  sharedCount: number;
};

export function buildContrastPreview(
  m: ContrastMeasurement | null,
  verdict: VerdictKind,
  elements: number,
): ContrastPreview | null {
  if (!m || !m.fromHex || !m.bgHex || !m.toHex || m.fixed == null || !m.prop) return null;

  const prop = m.prop;
  const simFg = prop === "color" ? m.toHex : m.fromHex;
  const simBg = prop === "background" ? m.toHex : m.bgHex;
  const passesCalc = m.fixed >= m.required;

  let confidence: PreviewConfidence;
  let reason: string | undefined;
  if (verdict === "verified") {
    confidence = "verified";
  } else if (verdict === "failed" || verdict === "partial") {
    confidence = "inconclusive";
    reason =
      "The calculated pair reaches the minimum, but the live re-audit still flags it — the real background is probably an image, gradient or overlapping layer, so this sampled solid color isn't the true background.";
  } else if (passesCalc) {
    confidence = "calculated";
  } else {
    confidence = "inconclusive";
    reason = "No color change alone reaches the minimum on this hue pair.";
  }

  return {
    prop,
    original: { fg: m.fromHex, bg: m.bgHex, ratio: m.measured },
    simulated: { fg: simFg, bg: simBg, ratio: m.fixed },
    required: m.required,
    passesCalc,
    confidence,
    reason,
    originalValue: prop === "color" ? m.fromHex : m.bgHex,
    suggestedValue: m.toHex,
    shared: elements > 1,
    sharedCount: elements,
  };
}
