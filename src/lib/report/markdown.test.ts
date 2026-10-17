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
    counts: {
      critical: 0,
      serious: 1,
      moderate: 2,
      minor: 0,
      passed: 39,
      bestPractice: 0,
      manualReview: 4,
    },
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

  it("leads with where the page stands, not with a grade", () => {
    expect(md).toContain("Where this page stands");
    expect(md).toContain("Failing");
    expect(md).not.toMatch(/\d+ \/ 100/);
  });

  it("gives the separate WCAG reading with AAA not evaluated", () => {
    expect(md).toContain("**AA:** fails by 1.4.3 Contrast (Minimum)");
    expect(md).toContain("**AAA:** not evaluated");
  });

  it("says fixes are tested on a copy, keeps the real measurement, and never extrapolates the sample", () => {
    expect(md).toContain("**Fix tested.**");
    expect(md).toContain("tested on a copy of the page");
    expect(md).toContain("not tested one by one");
    expect(md).toContain("the audited site is never changed");
    expect(md).toMatch(/2\.10:1 · minimum AA 4\.5:1 · fix reaches 4\.62:1/);
    expect(md.toLowerCase()).not.toContain("clears all");
    expect(md.toLowerCase()).not.toMatch(/of 7 (occurrences )?(were )?cleared/);
  });

  it("puts a verification label only where something was re-run", () => {
    const labelled = md.split("\n").filter((line) => line.startsWith("**Fix tested.**"));
    const plain = md.split("\n").filter((line) => /^_[A-Z]/.test(line));

    expect(labelled.length).toBe(1);
    expect(plain.length).toBeGreaterThan(0);
    expect(md).not.toContain("Not re-audited");
    expect(md).not.toContain("Could not verify");
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

describe("what the export no longer ranks", () => {
  const md = buildReportMarkdown(result({ violations: [contrast] }));

  it("has no table of shares of what is left", () => {
    expect(md).not.toContain("What to fix first");
    expect(md).not.toMatch(/% of what is left/);
  });

  it("still says how many items need a manual review", () => {
    expect(md).toMatch(/manual-review items? (is|are) not counted here/);
  });
});

describe("where a reading-order observation lands in the report", () => {
  const withGuess = result({
    violations: [contrast],
    keyboard: {
      totalStops: 12,
      totalInteractive: 12,
      reachableInteractive: 12,
      truncated: false,
      cycleComplete: true,
      startedAtTop: true,
      stoppedBy: "cycle",
      focusPath: [],
      findings: [
        {
          id: "focus-order",
          severity: "moderate",
          evidence: "heuristic",
          criterion: "WCAG 2.4.3 · Focus Order",
          title: "Focus order jumps out of sequence 2 times",
          desc: "desc",
          fix: "fix",
          count: 2,
          selectors: [".a"],
          occurrences: [],
        },
      ],
    },
  });

  const md = buildReportMarkdown(withGuess);

  it("keeps it out of the list of failures", () => {
    const failures = md.slice(md.indexOf("## Findings"), md.indexOf("## Observations"));
    expect(failures).toContain("Text below the minimum contrast");
    expect(failures).not.toContain("Focus order jumps out of sequence");
  });

  it("gives it its own section, said to be not counted here", () => {
    const section = md.slice(md.indexOf("## Observations"));
    expect(section).toContain("Focus order jumps out of sequence");
    expect(section).toContain("not counted here");
  });

  it("puts the failures before the observations", () => {
    expect(md.indexOf("## Findings")).toBeLessThan(md.indexOf("## Observations"));
  });
});

describe("a missing focus indicator with the rule that removes the outline", () => {
  const md = buildReportMarkdown(
    result({
      keyboard: {
        totalStops: 3,
        totalInteractive: 3,
        reachableInteractive: 3,
        truncated: false,
        cycleComplete: true,
        startedAtTop: true,
        stoppedBy: "cycle",
        focusPath: [],
        findings: [
          {
            id: "focus-not-visible",
            severity: "serious",
            evidence: "measured",
            criterion: "WCAG 2.4.7 · Focus Visible",
            title: "No visible focus indicator on 2 elements",
            desc: "desc",
            fix: "fix",
            count: 2,
            selectors: ["#gift", "#remote"],
            occurrences: [],
            fixes: [
              {
                text: "This rule removes the outline when the element has focus. Replace it with a :focus-visible style.",
                removed: "button.ghost.plain { outline: none }",
                code: "button.ghost.plain:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}",
                note: "Rule found in the <style> on this page.",
                count: 1,
                selectors: ["#gift"],
                verification: "unchecked",
              },
              {
                text: "",
                note: "If another rule removes the outline, your :focus-visible rule needs to be at least as specific, or it won't show.",
                count: 1,
                selectors: ["#remote"],
                verification: "unchecked",
              },
            ],
          },
        ],
      },
    }),
  );

  it("writes the change as a diff, with where the rule was found", () => {
    expect(md).toContain(
      "```diff\n- button.ghost.plain { outline: none }\n+ button.ghost.plain:focus-visible {\n+   outline: 2px solid currentColor;",
    );
    expect(md).toContain("_Rule found in the <style> on this page._");
  });

  it("keeps the general example, with the caution, where no rule was found", () => {
    expect(md).toContain("```css\n:focus-visible {\n  outline: 2px solid #17181a;");
    expect(md).toContain("_If another rule removes the outline");
  });
});
