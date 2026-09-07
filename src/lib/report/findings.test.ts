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
      bestPractice: [
        { id: "region", title: "All content in landmarks", desc: "d", nodes: 1, selectors: [".n"] },
      ],
    });
    const f = buildFindings(r);
    expect(f.map((x) => x.id)).toEqual([
      "wcag:color-contrast",
      "wcag:heading-order",
      "best-practice:region",
    ]);
    expect(f[0].n).toBe(1);
    const bp = f[2];
    expect(bp.isWcag).toBe(false);
    expect(bp.severity).toBeNull();
    expect(bp.passLabel).toBe("Best practice");
  });

  it("parses a real contrast measurement, and separates finding verdict from located-element preview", () => {
    const f = buildFindings(baseResult({ violations: [contrast] }))[0];
    expect(f.measurement).toMatchObject({
      measured: 2.1,
      required: 4.5,
      fixed: 4.62,
      bgHex: "#ffffff",
    });
    expect(f.verdict.kind).toBe("sampled");
    expect(f.verdict.reaudited).toBe(1);
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

describe("buildFindings: one row per rule, whatever found it", () => {
  const targetSize = {
    id: "target-size",
    severity: "serious" as const,
    criterion: "WCAG 2.5.8 · Target Size (Minimum)",
    title: "144 touch targets are smaller than 24×24px",
    desc: "d",
    fix: "Grow each control to at least 24×24px.",
    count: 144,
    selectors: [".tiny"],
  };

  it("lists an own-rule failure on a page axe found nothing on", () => {
    const findings = buildFindings(
      baseResult({
        violations: [],
        audits: { targetSize: { measured: 200, findings: [targetSize] } },
      }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("serious");
    expect(findings[0].passLabel).toBe("Target size");
  });

  it("names the source of every row, so one list can hold both origins", () => {
    const findings = buildFindings(
      baseResult({
        violations: [contrast],
        audits: { targetSize: { measured: 200, findings: [targetSize] } },
      }),
    );

    expect(findings.map((f) => f.passLabel)).toEqual(["Target size", null]);
    expect(findings.map((f) => f.kind)).toEqual(["target-size", "wcag"]);
  });

  it("shows target-size once when axe and this project both report it", () => {
    const axeTargetSize: ScanViolation = {
      id: "target-size",
      severity: "serious",
      title: "All touch targets must be 24px large, or leave sufficient space",
      criterion: "WCAG 2.5.8 · Target Size (Minimum)",
      where: ".tiny",
      desc: "d",
      fix: "f",
      nodes: 4,
    };

    const findings = buildFindings(
      baseResult({
        violations: [axeTargetSize],
        audits: { targetSize: { measured: 200, findings: [targetSize] } },
      }),
    );

    expect(findings.filter((f) => f.ruleId === "target-size")).toHaveLength(1);
    expect(findings[0].kind).toBe("wcag");
  });

  it("keeps a rule off the list when another context already reported it", () => {
    const findings = buildFindings(
      baseResult({
        violations: [],
        audits: { targetSize: { measured: 200, findings: [targetSize] } },
        contexts: {
          mobile: {
            width: 375,
            ran: true,
            onlyOnMobile: [
              {
                id: "target-size",
                severity: "serious",
                title: "All touch targets must be 24px large",
                criterion: "WCAG 2.5.8 · Target Size (Minimum)",
                nodes: 9,
                selectors: [".tiny"],
              },
            ],
          },
          dynamic: { ran: true, opened: 0, states: [] },
        },
      }),
    );

    expect(findings.filter((f) => f.ruleId === "target-size")).toHaveLength(1);
    expect(findings[0].kind).toBe("target-size");
  });

  it("names the context on a rule that only failed there", () => {
    const findings = buildFindings(
      baseResult({
        violations: [],
        contexts: {
          mobile: {
            width: 375,
            ran: true,
            onlyOnMobile: [
              {
                id: "label",
                severity: "critical",
                title: "Form elements must have labels",
                criterion: "WCAG 4.1.2 · Name, Role, Value",
                nodes: 1,
                selectors: ["input"],
              },
            ],
          },
          dynamic: { ran: true, opened: 0, states: [] },
        },
      }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].contexts).toEqual(["375px viewport"]);
  });

  it("folds the context into the surviving row instead of dropping it", () => {
    const findings = buildFindings(
      baseResult({
        violations: [contrast],
        contexts: {
          mobile: {
            width: 375,
            ran: true,
            onlyOnMobile: [
              {
                id: "color-contrast",
                severity: "serious",
                title: "Elements must meet minimum color contrast ratio thresholds",
                criterion: "WCAG 1.4.3 · Contrast (Minimum)",
                nodes: 3,
                selectors: [".cta"],
              },
            ],
          },
          dynamic: { ran: true, opened: 0, states: [] },
        },
      }),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("wcag");
    expect(findings[0].contexts).toEqual(["375px viewport"]);
  });

  it("carries the contexts of a rule that only failed there", () => {
    const findings = buildFindings(
      baseResult({
        violations: [
          {
            ...contrast,
            contexts: ["375px viewport"],
          },
        ],
      }),
    );

    expect(findings[0].contexts).toEqual(["375px viewport"]);
  });
});
