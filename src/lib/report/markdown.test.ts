import { describe, expect, it } from "vitest";
import type { ScanResult, ScanViolation } from "@/lib/scan/types";
import { buildReportMarkdown, reportMarkdownFilename } from "./markdown";

function result(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://aurora-coffee.com",
    title: "Aurora",
    scannedElements: 42,
    durationMs: 12400,
    screenshot: null,
    score: 71,
    counts: { critical: 0, serious: 1, moderate: 2, minor: 0, passed: 39, bestPractice: 0, manualReview: 4 },
    summary: "One fix unblocks the essential.",
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
  where: "a.hero__cta",
  desc: "Ensures contrast.",
  fix: "Replace text color #8fb8a8 with #2f6b57 → 4.62:1 against #ffffff (was 2.10:1, needs 4.5:1).",
  fixCode: "color: #2f6b57;",
  nodes: 7,
  verification: "verified",
};

describe("buildReportMarkdown", () => {
  const md = buildReportMarkdown(result({ violations: [contrast] }));

  it("labels the score as internal priority, not conformance", () => {
    expect(md).toContain("Internal priority score");
    expect(md).toMatch(/71 \/ 100/);
  });

  it("gives the separate WCAG reading with AAA not evaluated", () => {
    expect(md).toContain("**AA:** fails by 1.4.3 Contrast (Minimum)");
    expect(md).toContain("**AAA:** not evaluated");
  });

  it("keeps sandbox language, the real measurement, and never extrapolates the sample", () => {
    expect(md).toContain("One example checked");
    expect(md).toContain("sandbox copy");
    expect(md).toContain("not individually verified");
    expect(md).toContain("the audited site is not altered");
    expect(md).toMatch(/2\.10:1 · minimum AA 4\.5:1 · fix reaches 4\.62:1/);
    expect(md.toLowerCase()).not.toContain("clears all");
    expect(md.toLowerCase()).not.toMatch(/of 7 (occurrences )?(were )?cleared/);
  });

  it("never uses forbidden conformance vocabulary", () => {
    for (const banned of ["certified", "100% accessible", "compliant", "guarantee compliance"]) {
      expect(md.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("slugifies the filename from the host", () => {
    expect(reportMarkdownFilename(result({}))).toBe("accesscheck-aurora-coffee-com.md");
  });
});
