import { describe, expect, it } from "vitest";
import { translator } from "../i18n/t";
import { fixContrast } from "../scan/remediate";
import { parseContrastFix, ratioPosition } from "./contrast";

describe("parseContrastFix", () => {
  it("parses a foreground-color fix (text + code)", () => {
    const fix =
      "Replace text color #8fb8a8 with #2f6b57 → 4.62:1 against #ffffff " +
      "(was 2.10:1, needs 4.5:1). The hue stays the same; only the lightness changes.";
    const m = parseContrastFix(fix, "color: #2f6b57;");
    expect(m).toMatchObject({
      measured: 2.1,
      required: 4.5,
      fixed: 4.62,
      fromHex: "#8fb8a8",
      toHex: "#2f6b57",
      prop: "color",
    });
  });

  it("parses a background-only fix", () => {
    const fix =
      "Text color #8fb8a8 can't reach 4.5:1 on #ffffff by changing the text alone. " +
      "Set the background to #2f6b57 instead → 4.62:1 (was 2.10:1, needs 4.5:1). " +
      "The background hue stays the same; only its lightness changes.";
    const m = parseContrastFix(fix, "background: #2f6b57;");
    expect(m).toMatchObject({
      measured: 2.1,
      required: 4.5,
      fixed: 4.62,
      toHex: "#2f6b57",
      prop: "background",
    });
  });

  it("parses the no-fix variant with no target color", () => {
    const fix =
      "Text color #8fb8a8 on #ffffff reaches only 2.10:1 (needs 4.5:1). " +
      "Neither the text nor the background clears it by lightness alone on these hues.";
    const m = parseContrastFix(fix);
    expect(m).toMatchObject({ measured: 2.1, required: 4.5, fixed: null, toHex: null });
    expect(m?.fromHex).toBe("#8fb8a8");
  });

  it("reads the same fix written in Portuguese", () => {
    const fix =
      "Troque a cor do texto #a09a8a por #7a7569 → 4.51:1 contra #fffdf7 " +
      "(era 2.76:1, precisa de 4.5:1). A matiz continua a mesma; só a luminosidade muda.";
    expect(parseContrastFix(fix, "color: #7a7569;")).toMatchObject({
      measured: 2.76,
      required: 4.5,
      fixed: 4.51,
      fromHex: "#a09a8a",
      toHex: "#7a7569",
      bgHex: "#fffdf7",
      prop: "color",
    });
  });

  it("reads a Portuguese background fix and the no-fix variant", () => {
    const background =
      "A cor de texto #8fb8a8 não alcança 4.5:1 sobre #ffffff mudando só o texto. " +
      "Defina o fundo como #2f6b57 → 4.62:1 (era 2.10:1, precisa de 4.5:1).";
    expect(parseContrastFix(background)).toMatchObject({
      measured: 2.1,
      fixed: 4.62,
      fromHex: "#8fb8a8",
      toHex: "#2f6b57",
      bgHex: "#ffffff",
      prop: "background",
    });
    const neither =
      "A cor de texto #777777 sobre #888888 alcança apenas 1.20:1 (precisa de 4.5:1). " +
      "Nem o texto nem o fundo resolvem só pela luminosidade nestas matizes.";
    expect(parseContrastFix(neither)).toMatchObject({ measured: 1.2, required: 4.5, toHex: null });
  });

  it("reads back every contrast fix the catalogs write, in both languages", () => {
    const pairs = [
      { fgColor: "#8fb8a8", bgColor: "#ffffff", contrastRatio: 2.1, expectedContrastRatio: 4.5 },
      { fgColor: "#ff0000", bgColor: "#00ff00", contrastRatio: 2.91, expectedContrastRatio: 4.5 },
      { fgColor: "#111111", bgColor: "#777777", contrastRatio: 4.22, expectedContrastRatio: 7 },
      { fgColor: "#777777", bgColor: "#767676", contrastRatio: 1.02, expectedContrastRatio: 7 },
    ];
    for (const locale of ["en", "pt-BR"] as const) {
      for (const pair of pairs) {
        const fix = fixContrast(pair, translator(locale));
        expect(fix, `${locale} ${pair.fgColor}`).not.toBeNull();
        expect(parseContrastFix(fix!.text, fix!.code), `${locale}: ${fix!.text}`).toMatchObject({
          measured: pair.contrastRatio,
          required: pair.expectedContrastRatio,
          fromHex: pair.fgColor,
          bgHex: pair.bgColor,
        });
      }
    }
  });

  it("returns null for a non-contrast fix", () => {
    expect(parseContrastFix("This image has no alt text.", 'alt="Logo"')).toBeNull();
    expect(parseContrastFix("")).toBeNull();
  });
});

describe("ratioPosition", () => {
  it("positions ratios linearly on the 1:1–7:1 scale", () => {
    expect(ratioPosition(1)).toBe(0);
    expect(ratioPosition(7)).toBe(100);
    expect(ratioPosition(4)).toBeCloseTo(50, 5);
    expect(ratioPosition(4.5)).toBeCloseTo((3.5 / 6) * 100, 5);
  });

  it("clamps out-of-range ratios", () => {
    expect(ratioPosition(0.5)).toBe(0);
    expect(ratioPosition(21)).toBe(100);
  });
});
