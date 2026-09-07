import { describe, expect, it } from "vitest";
import { buildCounts, buildSummary, computeScore } from "./derive";
import {
  SCORING_VERSION,
  ownRuleViolations,
  scoredViolations,
  scoringVersionOf,
  violationsBehindScore,
} from "./scored";
import type { ScanResult, Severity } from "./types";

function finding(id: string, severity: Severity, count: number) {
  return {
    id,
    severity,
    criterion: `WCAG 2.5.8 · Target Size (Minimum)`,
    title: `${count} touch targets are smaller than 24×24px`,
    desc: "desc",
    fix: "fix",
    count,
    selectors: [".tiny", ".small"],
  };
}

const clean: Pick<ScanResult, "violations" | "keyboard" | "audits"> = {
  violations: [],
  audits: { targetSize: { measured: 0, findings: [finding("target-size-min", "serious", 144)] } },
};

describe("scoredViolations", () => {
  it("counts an own-rule failure as one rule that hit many elements", () => {
    const scored = scoredViolations(clean);
    expect(scored).toHaveLength(1);
    expect(scored[0]).toMatchObject({ severity: "serious", nodes: 144, where: ".tiny" });
  });

  it("cannot report a clean page while an own rule failed", () => {
    const scored = scoredViolations(clean);
    const counts = buildCounts(scored, { passed: 45, bestPractice: 0, manualReview: 1 });

    expect(counts.serious).toBe(1);
    expect(computeScore(scored)).toBeLessThan(100);
    expect(buildSummary(counts)).not.toContain("Excellent");
  });

  it("keeps rules and elements apart", () => {
    const counts = buildCounts(scoredViolations(clean), {
      passed: 45,
      bestPractice: 0,
      manualReview: 1,
    });
    expect(counts.serious).toBe(1);
    expect(scoredViolations(clean)[0].nodes).toBe(144);
  });

  it("takes keyboard, target size, reduced motion and live regions alike", () => {
    const own = ownRuleViolations({
      keyboard: {
        totalStops: 0,
        totalInteractive: 0,
        reachableInteractive: 0,
        truncated: false,
        cycleComplete: true,
        focusPath: [],
        findings: [
          { ...finding("focus-not-visible", "serious", 20), id: "focus-not-visible" as const },
        ],
      },
      audits: {
        targetSize: { measured: 0, findings: [finding("target-size-min", "serious", 144)] },
        reducedMotion: {
          ran: true,
          running: 1,
          findings: [finding("motion-ignores-preference", "moderate", 2)],
        },
        liveRegions: { regions: 0, findings: [finding("live-region-invalid", "serious", 1)] },
      },
    });

    expect(own.map((v) => v.id)).toEqual([
      "focus-not-visible",
      "target-size-min",
      "motion-ignores-preference",
      "live-region-invalid",
    ]);
  });

  it("charges a rule once when axe reports the same id", () => {
    const axeTargetSize = {
      id: "target-size",
      severity: "serious" as Severity,
      title: "Touch targets must be large enough",
      criterion: "WCAG 2.5.8",
      where: ".tiny",
      desc: "d",
      fix: "f",
      nodes: 4,
    };
    const scored = scoredViolations({
      violations: [axeTargetSize],
      audits: { targetSize: { measured: 9, findings: [finding("target-size", "serious", 144)] } },
    });

    expect(scored).toHaveLength(1);
    expect(scored[0]).toBe(axeTargetSize);
  });

  it("leaves axe violations first and untouched", () => {
    const axeViolation = {
      id: "image-alt",
      severity: "critical" as Severity,
      title: "Images must have alternative text",
      criterion: "WCAG 1.1.1",
      where: "img",
      desc: "d",
      fix: "f",
      nodes: 2,
    };
    const scored = scoredViolations({ ...clean, violations: [axeViolation] });
    expect(scored[0]).toBe(axeViolation);
    expect(scored).toHaveLength(2);
  });
});

describe("alternative contexts", () => {
  const mobileOnly = {
    id: "color-contrast",
    severity: "serious" as Severity,
    title: "Elements must meet minimum color contrast ratio thresholds",
    criterion: "WCAG 1.4.3 · Contrast (Minimum)",
    nodes: 3,
    selectors: [".cta"],
  };

  const contexts = (
    issues = [mobileOnly],
    states: { label: string; issues: typeof issues }[] = [],
  ) => ({
    mobile: { ran: true, width: 375, onlyOnMobile: issues },
    dynamic: {
      ran: true,
      opened: states.length,
      states: states.map((s) => ({ label: s.label, selector: "button", newIssues: s.issues })),
    },
  });

  it("charges a rule that fails only at another viewport", () => {
    const scored = scoredViolations({ violations: [], contexts: contexts() });

    expect(scored).toHaveLength(1);
    expect(scored[0].id).toBe("color-contrast");
    expect(computeScore(scored)).toBeLessThan(100);
    expect(buildCounts(scored, { passed: 1, bestPractice: 0, manualReview: 0 }).serious).toBe(1);
  });

  it("charges a rule once when it fails on first load and again on mobile", () => {
    const onLoad = {
      id: "color-contrast",
      severity: "serious" as Severity,
      title: "Elements must meet minimum color contrast ratio thresholds",
      criterion: "WCAG 1.4.3",
      where: ".cta",
      desc: "d",
      fix: "f",
      nodes: 7,
    };

    const scored = scoredViolations({ violations: [onLoad], contexts: contexts() });

    expect(scored).toHaveLength(1);
    expect(scored[0]).toBe(onLoad);
    expect(scored[0].nodes).toBe(7);
  });

  it("keeps which contexts made the rule fail", () => {
    const scored = scoredViolations({
      violations: [],
      contexts: contexts([mobileOnly], [{ label: "Menu open", issues: [mobileOnly] }]),
    });

    expect(scored).toHaveLength(1);
    expect(scored[0].contexts).toEqual(["375px viewport", "Menu open"]);
  });

  it("does not charge an own rule twice through a context", () => {
    const scored = scoredViolations({
      violations: [],
      audits: { targetSize: { measured: 9, findings: [finding("target-size", "serious", 144)] } },
      contexts: contexts([{ ...mobileOnly, id: "target-size" }]),
    });

    expect(scored).toHaveLength(1);
    expect(scored[0].nodes).toBe(144);
  });
});

describe("partial readings never claim a clean page", () => {
  const none = { critical: 0, serious: 0, moderate: 0 };

  it("says what it is speaking for when checks were skipped", () => {
    expect(buildSummary(none, { partial: true })).not.toContain("Excellent");
    expect(buildSummary(none, { partial: true })).toContain("checks that ran");
  });

  it("still reads plainly when everything ran", () => {
    expect(buildSummary(none)).toBe("Excellent. No automated findings on this page.");
  });

  it("scopes an absence claim that sits next to real findings", () => {
    expect(buildSummary({ critical: 0, serious: 2, moderate: 0 }, { partial: true })).toContain(
      "No critical blockers among the checks that ran",
    );
  });
});

describe("scoring model version", () => {
  const own = { targetSize: { measured: 9, findings: [finding("target-size", "serious", 144)] } };

  it("reads a result with no version as the legacy model", () => {
    expect(scoringVersionOf({})).toBe(1);
    expect(scoringVersionOf({ scoringVersion: SCORING_VERSION })).toBe(SCORING_VERSION);
  });

  it("explains a legacy score with the rules that produced it", () => {
    const legacy = { violations: [], audits: own };

    expect(scoredViolations(legacy)).toHaveLength(1);
    expect(violationsBehindScore(legacy)).toEqual([]);
  });

  it("explains a current score with everything it charges", () => {
    const current = { violations: [], audits: own, scoringVersion: SCORING_VERSION };

    expect(violationsBehindScore(current)).toHaveLength(1);
  });
});
