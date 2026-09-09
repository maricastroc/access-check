import type { FixVerification } from "@/lib/scan/types";
import type { ContrastMeasurement } from "./contrast";
import { translator } from "../i18n/t";

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
    reason = translator()("preview.stillFlagged");
  } else if (passesCalc) {
    confidence = "calculated";
  } else {
    confidence = "inconclusive";
    reason = translator()("preview.noColorReaches");
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
