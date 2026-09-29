import { describe, expect, it } from "vitest";
import type { ScanResult, ScanViolation } from "@/lib/scan/types";
import { buildReportView, workLine } from "./report-model";
import { translator } from "@/lib/i18n/t";
import { workQueue } from "@/lib/report/findings";

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
  it("derives findings, WCAG reading and host from the result", () => {
    const view = buildReportView(result({ violations: [contrast] }));

    expect(view.findings.map((f) => f.ruleId)).toContain("color-contrast");
    expect(view).not.toHaveProperty("breakdown");
    expect(view.wcag.aa.fails).toBe(true);
    expect(view.host).toBe("aurora-coffee.com");
  });
});

describe("the queue the results page reads from", () => {
  const review = {
    id: "label-content-name-mismatch",
    title: "Check the visible label",
    desc: "d",
    nodes: 2,
    criterion: "WCAG 2.5.3 · Label in Name",
    selectors: [".y"],
  };

  it("groups what to fix, what to check by hand and the recommendations", () => {
    const view = buildReportView(result({ violations: [contrast], incomplete: [review] }));
    expect(view.groups.map((g) => g.group)).toEqual(["fix", "check", "recommend"]);
    expect(view.groups[0].findings.map((f) => f.ruleId)).toEqual(["color-contrast"]);
    expect(view.groups[1].findings.map((f) => f.kind)).toEqual(["manual-review"]);
  });

  it("lists the manual reviews with the findings, numbered in queue order", () => {
    const view = buildReportView(result({ violations: [contrast], incomplete: [review] }));
    expect(view.findings.map((f) => f.id)).toEqual(
      view.groups.flatMap((g) => g.findings.map((f) => f.id)),
    );
    expect(view.findings.map((f) => f.n)).toEqual([1, 2]);
  });
});

describe("the line of work left at the top", () => {
  const t = translator();
  const pt = translator("pt-BR");
  const review = {
    id: "color-contrast",
    title: "Check contrast",
    desc: "d",
    nodes: 1,
    criterion: "WCAG 1.4.3 · Contrast (Minimum)",
    selectors: [".x"],
  };

  it("counts the same groups the queue is built from", () => {
    const withBoth = result({
      violations: [contrast],
      incomplete: [review, { ...review, id: "x" }],
    });
    const [fix, check] = workQueue(withBoth);
    expect(workLine(withBoth, t)).toBe(
      `${fix.findings.length} to fix · ${check.findings.length} to check by hand`,
    );
    expect(workLine(withBoth, t)).toBe("1 to fix · 2 to check by hand");
  });

  it("leaves out a part that has nothing in it", () => {
    expect(workLine(result({ violations: [contrast] }), t)).toBe("1 to fix");
    expect(workLine(result({ incomplete: [review] }), t)).toBe("1 to check by hand");
    expect(workLine(result({}), t)).toBe("");
  });

  it("speaks the reader's language", () => {
    expect(workLine(result({ violations: [contrast], incomplete: [review] }), pt)).toBe(
      "1 para corrigir · 1 para conferir à mão",
    );
  });
});
