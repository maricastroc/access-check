import { describe, expect, it } from "vitest";
import { buildFixFirst, buildSummary, computeScore } from "./derive";
import type { ScanViolation, Severity } from "./types";

const v = (severity: Severity, nodes = 1, id = "rule"): ScanViolation => ({
  id,
  severity,
  title: `${severity} issue`,
  criterion: "1.1.1",
  where: "body",
  desc: "desc",
  fix: "fix",
  nodes,
});

describe("computeScore", () => {
  it("a page with no violations scores 100", () => {
    expect(computeScore([])).toBe(100);
  });

  it("a critical violation drops the score", () => {
    expect(computeScore([v("critical", 3)])).toBeLessThan(100);
  });

  it("more occurrences never increase the score", () => {
    const um = computeScore([v("serious", 1)]);
    const muitos = computeScore([v("serious", 5)]);
    expect(muitos).toBeLessThanOrEqual(um);
  });

  it("higher severity penalizes more than lower", () => {
    expect(computeScore([v("critical")])).toBeLessThan(computeScore([v("minor")]));
  });

  it("never leaves the 0–100 range", () => {
    const muitas = Array.from({ length: 50 }, () => v("critical", 5));
    const s = computeScore(muitas);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("buildFixFirst", () => {
  it("sorts by severity and returns at most 4, numbered", () => {
    const top = buildFixFirst([v("minor"), v("critical"), v("moderate"), v("serious"), v("minor")]);
    expect(top).toHaveLength(4);
    expect(top[0].impact).toBe("High");
    expect(top[0].n).toBe("01");
    expect(top[3].n).toBe("04");
  });

  it("breaks ties by number of occurrences", () => {
    const [first] = buildFixFirst([v("serious", 2, "a"), v("serious", 9, "b")]);
    expect(first.title).toBe("serious issue");
    expect(first.effort).toBeDefined();
  });

  it("effort is qualitative, never a fixed time (no false precision)", () => {
    const items = buildFixFirst([
      v("critical", 1, "color-contrast"),
      v("serious", 1, "label"),
      v("moderate", 1, "heading-order"),
    ]);
    for (const item of items) {
      expect(["Quick", "Moderate", "Involved"]).toContain(item.effort);
      expect(item.effort).not.toMatch(/min/);
    }
  });
});

describe("buildSummary", () => {
  it("highlights criticals when there are any", () => {
    expect(buildSummary({ critical: 2, serious: 0, moderate: 0 })).toMatch(/critical/);
  });
  it("falls back to serious, then moderate", () => {
    expect(buildSummary({ critical: 0, serious: 1, moderate: 0 })).toMatch(/serious/);
    expect(buildSummary({ critical: 0, serious: 0, moderate: 3 })).toMatch(/moderate/i);
  });
  it("celebrates when everything is clean", () => {
    expect(buildSummary({ critical: 0, serious: 0, moderate: 0 })).toMatch(/Excellent/i);
  });
});

describe("buildSummary tells the four kinds apart", () => {
  const none = { critical: 0, serious: 0, moderate: 0 };

  it("says a clean page is clean when nothing at all is left", () => {
    expect(buildSummary(none)).toBe("Excellent. No automated findings on this page.");
  });

  it("does not call a page clean while a best practice is listed", () => {
    const text = buildSummary({ ...none, bestPractice: 1 });

    expect(text).not.toContain("Excellent");
    expect(text).toContain("No scored WCAG failures were found.");
    expect(text).toContain("1 best-practice recommendation remains, outside the score.");
  });

  it("names manual-review items left behind", () => {
    const text = buildSummary({ ...none, manualReview: 2 });

    expect(text).toContain("No scored WCAG failures were found.");
    expect(text).toContain("2 manual-review items remain, outside the score.");
  });

  it("names both when both are there", () => {
    expect(buildSummary({ ...none, bestPractice: 1, manualReview: 2 })).toBe(
      "No scored WCAG failures were found. 1 best-practice recommendation and 2 manual-review items remain, outside the score.",
    );
  });

  it("keeps the failure sentence first when something did fail", () => {
    const text = buildSummary({ critical: 1, serious: 0, moderate: 0, bestPractice: 1 });

    expect(text).toMatch(/^Strong foundation, but 1 critical finding blocks/);
    expect(text).toContain("1 best-practice recommendation remains");
  });

  it("keeps the partial caveat in every one of those states", () => {
    expect(buildSummary(none, { partial: true })).toContain("not a clean bill of health");
    expect(buildSummary({ ...none, bestPractice: 1 }, { partial: true })).toContain(
      "not a clean bill of health",
    );
    expect(buildSummary({ ...none, manualReview: 2 }, { partial: true })).toContain(
      "2 manual-review items remain",
    );
    expect(buildSummary({ critical: 1, serious: 0, moderate: 0 }, { partial: true })).toContain(
      "critical finding blocks",
    );
    expect(buildSummary({ critical: 0, serious: 2, moderate: 0 }, { partial: true })).toContain(
      "No critical blockers among the checks that ran",
    );
  });
});
