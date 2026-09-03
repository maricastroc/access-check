/**
 * The engine does not expose per-finding contrast ratios or before/after colors
 * as structured fields — it embeds them in the human-readable fix text/code that
 * src/lib/scan/remediate.ts (`fixContrast`) produces, e.g.:
 *
 *   "Replace text color #8fb8a8 with #2f6b57 → 4.62:1 against #ffffff
 *    (was 2.10:1, needs 4.5:1). Same hue — only the lightness changes."
 *
 * This parser extracts that real measurement so the "MEDIÇÃO" ratio ruler and
 * the before/after swatches only ever render true, engine-produced numbers.
 * When the text is not a contrast fix (no measured ratio), it returns null and
 * the caller omits the ratio block — the ruler never shows an invented measure.
 */

export type ContrastMeasurement = {
  measured: number; // ratio found on the page
  required: number; // AA minimum for this element
  fixed: number | null; // ratio the suggested fix reaches, if a fix was found
  fromHex: string | null; // original color the fix replaces
  toHex: string | null; // color the fix suggests
  prop: "color" | "background" | null; // which property the fix changes
};

export function parseContrastFix(fix: string, fixCode?: string): ContrastMeasurement | null {
  const text = fix ?? "";

  const measuredM =
    text.match(/\(was\s+([\d.]+):1/i) ?? text.match(/reaches only\s+([\d.]+):1/i);
  const requiredM = text.match(/needs\s+([\d.]+):1/i);
  if (!measuredM || !requiredM) return null;

  const measured = Number(measuredM[1]);
  const required = Number(requiredM[1]);
  if (!Number.isFinite(measured) || !Number.isFinite(required)) return null;

  const fixedM = text.match(/→\s*([\d.]+):1/);
  const fixed = fixedM ? Number(fixedM[1]) : null;

  // Prefer the structured fix code for the target color + property.
  let toHex: string | null = null;
  let prop: "color" | "background" | null = null;
  if (fixCode) {
    const codeM = fixCode.match(/^\s*(color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{6})/i);
    if (codeM) {
      prop = codeM[1].toLowerCase().startsWith("background") ? "background" : "color";
      toHex = codeM[2].toLowerCase();
    }
  }
  if (!toHex) {
    const withM = text.match(/with\s+(#[0-9a-fA-F]{6})/i);
    const bgM = text.match(/background to\s+(#[0-9a-fA-F]{6})/i);
    if (withM) {
      toHex = withM[1].toLowerCase();
      prop = prop ?? "color";
    } else if (bgM) {
      toHex = bgM[1].toLowerCase();
      prop = prop ?? "background";
    }
  }

  // The original color is always introduced as "text color #<hex>".
  const fromHex = text.match(/text color\s+(#[0-9a-fA-F]{6})/i)?.[1].toLowerCase() ?? null;

  return {
    measured,
    required,
    fixed: fixed !== null && Number.isFinite(fixed) ? fixed : null,
    fromHex,
    toHex,
    prop,
  };
}

/** Linear position of a contrast ratio on a 1:1–7:1 scale, as a percentage. */
export function ratioPosition(ratio: number, min = 1, max = 7): number {
  const clamped = Math.max(min, Math.min(max, ratio));
  return ((clamped - min) / (max - min)) * 100;
}
