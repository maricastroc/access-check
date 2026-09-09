import { describe, expect, it } from "vitest";
import { categoryOf, fixGuidance, humanImpact, isDocLevelCategory, markerReason } from "./guidance";
import { translator } from "../i18n/t";

const t = translator();

describe("humanImpact", () => {
  it("describes the consequence, not the rule, for contrast", () => {
    const impact = humanImpact("color-contrast", t);
    expect(impact).toMatch(/low vision|read/i);
    expect(impact).not.toMatch(/ensure|meets|threshold/i);
  });

  it("has a distinct impact per category", () => {
    expect(humanImpact("page-has-heading-one", t)).not.toBe(humanImpact("color-contrast", t));
    expect(humanImpact("unreachable-control", t, "keyboard")).toMatch(/keyboard/i);
  });
});

describe("fixGuidance", () => {
  it("gives a real HTML example for a missing h1", () => {
    const g = fixGuidance("page-has-heading-one", t)!;
    expect(g.action).toMatch(/<h1>/);
    expect(g.example?.code).toContain("<h1>");
    expect(g.caution).toBeTruthy();
  });

  it("gives landmark structure for content outside landmarks", () => {
    const g = fixGuidance("region", t)!;
    expect(g.example?.code).toContain("<main>");
  });

  it("returns null for categories with no generic-rule gap (engine text is concrete)", () => {
    expect(fixGuidance("color-contrast", t)).toBeNull();
  });
});

describe("categoryOf / markerReason", () => {
  it("maps rule ids and audit kinds to categories", () => {
    expect(categoryOf("color-contrast")).toBe("contrast");
    expect(categoryOf("x", "target-size")).toBe("target-size");
    expect(isDocLevelCategory("page-has-heading-one")).toBe(true);
    expect(isDocLevelCategory("color-contrast")).toBe(false);
  });

  it("explains why a doc-level finding has no marker", () => {
    expect(markerReason("html-has-lang", "wcag", true, t)).toMatch(/document|structure/i);
    expect(markerReason("color-contrast", "wcag", false, t)).toMatch(/viewport|hidden|box/i);
  });
});
