import { describe, expect, it } from "vitest";
import type { ScanMarker, ScanResult, ScanViolation } from "@/lib/scan/types";
import { buildFindings } from "./findings";

function baseResult(over: Partial<ScanResult>): ScanResult {
  return {
    url: "u",
    finalUrl: "https://example.com",
    title: "Example",
    scannedElements: 10,
    durationMs: 1000,
    screenshot: null,
    score: 71,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 1,
      minor: 0,
      passed: 39,
      bestPractice: 1,
      manualReview: 4,
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
  title: "Elements must meet minimum color contrast ratio thresholds",
  criterion: "WCAG 1.4.3 · Contrast (Minimum)",
  where: "a.hero__cta",
  desc: "Ensures contrast.",
  fix: "Replace text color #8fb8a8 with #2f6b57 → 4.62:1 against #ffffff (was 2.10:1, needs 4.5:1).",
  fixCode: "color: #2f6b57;",
  nodes: 7,
  verification: "verified",
};

const heading: ScanViolation = {
  id: "heading-order",
  severity: "moderate",
  title: "Heading levels should only increase by one",
  criterion: "WCAG 1.3.1 · Info and Relationships",
  where: "h4",
  desc: "Ensures the order of headings is semantically correct.",
  fix: "Use an h3 here.",
  nodes: 1,
  verification: "unchecked",
};

describe("buildFindings", () => {
  it("orders by severity and appends best-practice last with no WCAG severity", () => {
    const r = baseResult({
      violations: [heading, contrast],
      bestPractice: [{ id: "region", title: "All content in landmarks", desc: "d", nodes: 1, selectors: [".n"] }],
    });
    const f = buildFindings(r);
    expect(f.map((x) => x.id)).toEqual(["wcag:color-contrast", "wcag:heading-order", "best-practice:region"]);
    expect(f[0].n).toBe(1);
    const bp = f[2];
    expect(bp.isWcag).toBe(false);
    expect(bp.severity).toBeNull();
    expect(bp.passLabel).toBe("Best practice");
  });

  it("parses a real contrast measurement, verdict and preview", () => {
    const f = buildFindings(baseResult({ violations: [contrast] }))[0];
    expect(f.measurement).toMatchObject({ measured: 2.1, required: 4.5, fixed: 4.62, bgHex: "#ffffff" });
    expect(f.verdict.kind).toBe("verified");
    expect(f.impact).toContain("low vision");
    expect(f.preview?.confidence).toBe("verified");
    expect(f.preview?.simulated).toMatchObject({ fg: "#2f6b57", bg: "#ffffff" });
  });

  it("links only the finding's own capture markers", () => {
    const markers: ScanMarker[] = [
      { n: 1, severity: "serious", label: contrast.title, left: 10, top: 20, width: 5, height: 5 },
      { n: 2, severity: "moderate", label: heading.title, left: 30, top: 40, width: 5, height: 5 },
    ];
    const f = buildFindings(baseResult({ violations: [contrast, heading], markers }));
    const c = f.find((x) => x.id === "wcag:color-contrast")!;
    expect(c.markers.map((m) => m.n)).toEqual([1]);
  });

  it("folds keyboard findings in with unchecked sandbox status", () => {
    const r = baseResult({
      keyboard: {
        totalStops: 5,
        totalInteractive: 5,
        reachableInteractive: 5,
        truncated: false,
        cycleComplete: true,
        focusPath: [],
        findings: [
          {
            id: "focus-not-visible",
            severity: "serious",
            criterion: "WCAG 2.4.7 · Focus Visible",
            title: "Focus is not visible",
            desc: "d",
            fix: "add outline",
            count: 2,
            selectors: [".a", ".b"],
          },
        ],
      },
    });
    const f = buildFindings(r).find((x) => x.kind === "keyboard")!;
    expect(f.passLabel).toBe("Keyboard");
    expect(f.verdict.kind).toBe("complementary");
    expect(f.criterionSc).toBe("2.4.7");
    expect(f.guidance?.action).toContain("focus");
  });
});
