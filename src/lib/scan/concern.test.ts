import { describe, expect, it } from "vitest";
import { concernOf } from "./concern";
import { evidenceOf } from "./evidence";
import { scoredViolations } from "./scored";
import { buildFindings } from "@/lib/report/findings";
import type { ScanResult, ScanViolation } from "./types";

const axeTargetSize: ScanViolation = {
  id: "target-size",
  severity: "serious",
  title: "Touch targets must be 24px large, or leave sufficient space",
  criterion: "WCAG 2.5.8 · Target Size (Minimum)",
  where: ".tiny",
  desc: "axe says so",
  fix: "Grow it.",
  nodes: 6,
  evidence: "deterministic",
};

const ownCrowding = {
  id: "target-size-crowding",
  severity: "serious" as const,
  evidence: "measured" as const,
  criterion: "WCAG 2.5.8 · Target Size (Minimum)",
  title: "3 touch targets are smaller than 24×24px and crowded",
  desc: "measured here",
  fix: "Grow each control to at least 24×24px.",
  count: 3,
  selectors: [".a", ".b"],
};

const withBoth: Pick<ScanResult, "violations" | "keyboard" | "audits" | "contexts"> = {
  violations: [axeTargetSize],
  audits: { targetSize: { measured: 40, findings: [ownCrowding] } },
};

const ownOnly: Pick<ScanResult, "violations" | "keyboard" | "audits" | "contexts"> = {
  violations: [],
  audits: { targetSize: { measured: 40, findings: [ownCrowding] } },
};

function report(over: Pick<ScanResult, "violations" | "audits">): ScanResult {
  return {
    url: "u",
    finalUrl: "https://example.com",
    title: "t",
    scannedElements: 10,
    durationMs: 1,
    screenshot: null,
    score: 50,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      passed: 1,
      bestPractice: 0,
      manualReview: 0,
    },
    summary: "s",
    incomplete: [],
    bestPractice: [],
    passed: [],
    markers: [],
    fixFirst: [],
    ...over,
  };
}

describe("two engines measuring the same success criterion", () => {
  it("gives the project's own analysis an identity of its own", () => {
    expect(ownCrowding.id).not.toBe(axeTargetSize.id);
    expect(concernOf(ownCrowding.id)).toBe(concernOf(axeTargetSize.id));
  });

  it("charges the criterion once when both engines flag it", () => {
    const scored = scoredViolations(withBoth);
    expect(scored).toHaveLength(1);
    expect(scored[0].id).toBe("target-size");
  });

  it("shows the reader one row, not two for the same barrier", () => {
    const rows = buildFindings(report(withBoth));
    expect(rows.filter((r) => concernOf(r.ruleId) === "target-size")).toHaveLength(1);
  });

  it("still reports the own analysis when axe found nothing there", () => {
    const scored = scoredViolations(ownOnly);
    expect(scored.map((v) => v.id)).toEqual(["target-size-crowding"]);
    expect(buildFindings(report(ownOnly))[0].ruleId).toBe("target-size-crowding");
  });

  it("no longer reads an axe finding as if the project had measured it", () => {
    expect(evidenceOf({ id: "target-size" })).toBe("deterministic");
    expect(evidenceOf({ id: "target-size-crowding" })).toBe("measured");
  });

  it("gives both the same impact wording, whichever engine found it", () => {
    const fromAxe = buildFindings(report(withBoth))[0];
    const fromOwn = buildFindings(report(ownOnly))[0];
    expect(fromAxe.impact).toBe(fromOwn.impact);
  });

  it("leaves every other rule answering for itself", () => {
    expect(concernOf("color-contrast")).toBe("color-contrast");
    expect(concernOf("focus-order")).toBe("focus-order");
  });
});
