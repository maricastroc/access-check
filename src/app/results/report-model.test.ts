import { describe, expect, it } from "vitest";
import type { ScanResult, ScanViolation } from "@/lib/scan/types";
import type { FocusStop, KeyboardReport } from "@/lib/scan/keyboard";
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
    counts: { critical: 0, serious: 1, moderate: 0, minor: 0, passed: 39, bestPractice: 0, manualReview: 0 },
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

function stop(over: Partial<FocusStop>): FocusStop {
  return {
    n: 0,
    selector: ".x",
    label: "x",
    tag: "a",
    focusVisible: true,
    left: null,
    top: null,
    width: null,
    height: null,
    ...over,
  };
}

function keyboard(focusPath: FocusStop[]): KeyboardReport {
  return {
    totalStops: focusPath.length,
    totalInteractive: focusPath.length,
    reachableInteractive: focusPath.length,
    truncated: false,
    cycleComplete: true,
    focusPath,
    findings: [],
  };
}

describe("buildReportView", () => {
  it("derives findings, score breakdown, WCAG reading and host from the result", () => {
    const v = buildReportView(result({ violations: [contrast], score: 71 }));
    expect(v.host).toBe("aurora-coffee.com");
    expect(v.findings).toHaveLength(1);
    expect(v.breakdown.score).toBe(71);
    expect(v.wcag.aa.fails).toBe(true);
  });

  it("projects positioned focus stops onto the screenshot, skips unpositioned ones, clamps to 2..98", () => {
    const v = buildReportView(
      result({
        keyboard: keyboard([
          stop({ n: 1, left: 50, top: 40, width: 10, height: 6, focusVisible: true, label: "Skip link" }),
          stop({ n: 2, left: null, top: null }),
          stop({ n: 3, left: 99, top: 0, width: 4, height: 4, focusVisible: false, label: "Cart" }),
        ]),
      }),
    );
    expect(v.focusPoints.map((p) => p.n)).toEqual([1, 3]);
    expect(v.focusPoints[0]).toMatchObject({ cx: 55, cy: 43, visible: true, label: "Skip link" });
    expect(v.focusPoints[1]).toMatchObject({ cx: 98, cy: 2, visible: false });
  });

  it("returns no focus points when the audit has no keyboard pass", () => {
    expect(buildReportView(result({})).focusPoints).toEqual([]);
  });
});
