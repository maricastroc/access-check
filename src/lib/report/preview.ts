import type { FixVerification } from "@/lib/scan/types";
import type { ContrastMeasurement } from "./contrast";

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
  locatedVerification: FixVerification | undefined,
  elements: number,
): ContrastPreview | null {
  if (!m || !m.fromHex || !m.bgHex || !m.toHex || m.fixed == null || !m.prop) return null;

  const prop = m.prop;
  const simFg = prop === "color" ? m.toHex : m.fromHex;
  const simBg = prop === "background" ? m.toHex : m.bgHex;
  const passesCalc = m.fixed >= m.required;

  let confidence: PreviewConfidence;
  let reason: string | undefined;
  if (locatedVerification === "verified") {
    confidence = "verified";
  } else if (locatedVerification === "failed") {
    confidence = "inconclusive";
    reason =
      "The calculated pair reaches the minimum, but the located element's live re-audit still flags it. The real background is probably an image, gradient or overlapping layer, so this sampled solid color isn't the true background.";
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
