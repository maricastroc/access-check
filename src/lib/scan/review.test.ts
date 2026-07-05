import { describe, expect, it } from "vitest";
import { reviewGuidance } from "./review";

describe("reviewGuidance", () => {
  it("dá orientação específica pra regras conhecidas", () => {
    const cc = reviewGuidance("color-contrast");
    expect(cc.how.toLowerCase()).toContain("background");
    expect(cc.steps.length).toBeGreaterThan(0);

    const link = reviewGuidance("link-in-text-block");
    expect(link.how.toLowerCase()).toContain("colour");
  });

  it("cai num genérico útil pra regras não mapeadas", () => {
    const g = reviewGuidance("some-unknown-rule");
    expect(g.how).toMatch(/couldn't decide/i);
    expect(g.steps.length).toBeGreaterThan(0);
  });

  it("toda orientação tem 'how' não-vazio e ao menos um passo", () => {
    const ids = [
      "color-contrast",
      "link-in-text-block",
      "scrollable-region-focusable",
      "label-content-name-mismatch",
      "frame-title",
      "th-has-data-cells",
      "autocomplete-valid",
      "css-orientation-lock",
      "p-as-heading",
      "nested-interactive",
      "anything-else",
    ];
    for (const id of ids) {
      const g = reviewGuidance(id);
      expect(g.how.trim().length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThanOrEqual(1);
      expect(g.steps.every((s) => s.trim().length > 0)).toBe(true);
    }
  });
});
