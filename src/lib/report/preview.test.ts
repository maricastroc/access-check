import { describe, expect, it } from "vitest";
import type { ContrastMeasurement } from "./contrast";
import { buildContrastPreview } from "./preview";

const m: ContrastMeasurement = {
  measured: 2.1,
  required: 4.5,
  fixed: 4.62,
  fromHex: "#8fb8a8",
  toHex: "#2f6b57",
  bgHex: "#ffffff",
  prop: "color",
};

describe("buildContrastPreview", () => {
  it("returns null without enough color data", () => {
    expect(buildContrastPreview(null, "verified", 1)).toBeNull();
    expect(buildContrastPreview({ ...m, bgHex: null }, "verified", 1)).toBeNull();
    expect(buildContrastPreview({ ...m, fixed: null }, "unverifiable", 1)).toBeNull();
  });

  it("verified verdict → verified confidence with the real pair", () => {
    const p = buildContrastPreview(m, "verified", 7)!;
    expect(p.confidence).toBe("verified");
    expect(p.original).toEqual({ fg: "#8fb8a8", bg: "#ffffff", ratio: 2.1 });
    expect(p.simulated).toEqual({ fg: "#2f6b57", bg: "#ffffff", ratio: 4.62 });
    expect(p.passesCalc).toBe(true);
    expect(p.shared).toBe(true);
    expect(p.sharedCount).toBe(7);
  });

  it("not-verified but numbers pass → calculated (no green claim implied)", () => {
    const p = buildContrastPreview(m, "unverifiable", 1)!;
    expect(p.confidence).toBe("calculated");
  });

  it("re-audit failed → inconclusive with a background reason", () => {
    const p = buildContrastPreview(m, "failed", 1)!;
    expect(p.confidence).toBe("inconclusive");
    expect(p.reason).toMatch(/background/i);
  });

  it("background-change fixes swap the simulated background, not the text", () => {
    const p = buildContrastPreview({ ...m, prop: "background", toHex: "#123456" }, "unverifiable", 1)!;
    expect(p.simulated.bg).toBe("#123456");
    expect(p.simulated.fg).toBe("#8fb8a8");
    expect(p.prop).toBe("background");
  });
});
