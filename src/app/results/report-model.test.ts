import { describe, expect, it } from "vitest";
import type { ScanResult, ScanViolation } from "@/lib/scan/types";
import { buildReportView } from "./report-model";

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://aurora-coffee.com/menu",
    title: "Aurora",
    scannedElements: 10,
    durationMs: 1000,
    screenshot: null,
    score: 71,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      passed: 39,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "s",
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

const contrast: ScanViolation = {
  id: "color-contrast",
  severity: "serious",
  title: "Text below the minimum contrast",
  criterion: "WCAG 1.4.3 · Contrast (Minimum)",
  where: "a.cta",
  desc: "d",
  fix: "Replace text color #8fb8a8 with #2f6b57 → 4.62:1 against #ffffff (was 2.10:1, needs 4.5:1).",
  fixCode: "color: #2f6b57;",
  nodes: 3,
  verification: "verified",
};

describe("buildReportView", () => {
  it("derives findings, score breakdown, WCAG reading and host from the result", () => {
    const view = buildReportView(result({ violations: [contrast] }));

    expect(view.findings.map((f) => f.ruleId)).toContain("color-contrast");
    expect(view.breakdown.deductions.length).toBeGreaterThan(0);
    expect(view.wcag.aa.fails).toBe(true);
    expect(view.host).toBe("aurora-coffee.com");
  });
});
