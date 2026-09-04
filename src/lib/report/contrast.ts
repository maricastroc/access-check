export type ContrastMeasurement = {
  measured: number;
  required: number;
  fixed: number | null;
  fromHex: string | null;
  toHex: string | null;
  bgHex: string | null;
  prop: "color" | "background" | null;
};

export function parseContrastFix(fix: string, fixCode?: string): ContrastMeasurement | null {
  const text = fix ?? "";

  const measuredM = text.match(/\(was\s+([\d.]+):1/i) ?? text.match(/reaches only\s+([\d.]+):1/i);
  const requiredM = text.match(/needs\s+([\d.]+):1/i);
  if (!measuredM || !requiredM) return null;

  const measured = Number(measuredM[1]);
  const required = Number(requiredM[1]);
  if (!Number.isFinite(measured) || !Number.isFinite(required)) return null;

  const fixedM = text.match(/→\s*([\d.]+):1/);
  const fixed = fixedM ? Number(fixedM[1]) : null;

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

  const fromHex = text.match(/text color\s+(#[0-9a-fA-F]{6})/i)?.[1].toLowerCase() ?? null;

  const bgHex =
    (text.match(/against\s+(#[0-9a-fA-F]{6})/i) ??
      text.match(/\bon\s+(#[0-9a-fA-F]{6})/i))?.[1].toLowerCase() ?? null;

  return {
    measured,
    required,
    fixed: fixed !== null && Number.isFinite(fixed) ? fixed : null,
    fromHex,
    toHex,
    bgHex,
    prop,
  };
}

export function ratioPosition(ratio: number, min = 1, max = 7): number {
  const clamped = Math.max(min, Math.min(max, ratio));
  return ((clamped - min) / (max - min)) * 100;
}
