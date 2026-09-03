import { describe, expect, it } from "vitest";
import { buildWcagReading, parseCriterion } from "./wcag";

describe("parseCriterion", () => {
  it("splits the engine criterion string into SC number and name", () => {
    expect(parseCriterion("WCAG 1.4.3 · Contrast (Minimum)")).toMatchObject({
      sc: "1.4.3",
      name: "Contrast (Minimum)",
    });
  });

  it("handles a criterion with no name", () => {
    expect(parseCriterion("WCAG 2.4.1")).toMatchObject({ sc: "2.4.1", name: null });
  });

  it("returns null SC for a rule-id fallback", () => {
    expect(parseCriterion("color-contrast").sc).toBeNull();
  });
});

describe("buildWcagReading", () => {
  it("marks AA failing for a contrast violation and A clean", () => {
    const r = buildWcagReading([{ criterion: "WCAG 1.4.3 · Contrast (Minimum)" }]);
    expect(r.aa.fails).toBe(true);
    expect(r.aa.criteria[0]).toMatchObject({ sc: "1.4.3", name: "Contrast (Minimum)" });
    expect(r.a.fails).toBe(false);
    expect(r.aaa).toEqual({ evaluated: false });
  });

  it("classifies level-A criteria under A", () => {
    const r = buildWcagReading([{ criterion: "WCAG 1.1.1 · Non-text Content" }]);
    expect(r.a.fails).toBe(true);
    expect(r.aa.fails).toBe(false);
  });

  it("dedupes repeated criteria and sorts numerically", () => {
    const r = buildWcagReading([
      { criterion: "WCAG 1.4.11 · Non-text Contrast" },
      { criterion: "WCAG 1.4.3 · Contrast (Minimum)" },
      { criterion: "WCAG 1.4.3 · Contrast (Minimum)" },
    ]);
    expect(r.aa.criteria.map((c) => c.sc)).toEqual(["1.4.3", "1.4.11"]);
  });

  it("never evaluates AAA", () => {
    const r = buildWcagReading([]);
    expect(r.a.fails).toBe(false);
    expect(r.aa.fails).toBe(false);
    expect(r.aaa.evaluated).toBe(false);
  });
});
