import { AXE_TAGS, runAxeInPage } from "../../src/lib/scan/dom/axe";
import { collectElementInfo } from "../../src/lib/scan/dom/element-info";
import { collectRects, readViewport } from "../../src/lib/scan/dom/rects";
import { collectLiveRegionsRaw } from "../../src/lib/scan/dom/live-regions";
import { collectTargetSizeRaw } from "../../src/lib/scan/dom/target-size";
import { analyzeLiveRegions } from "../../src/lib/scan/live-regions";
import { analyzeTargetSize, INTERACTIVE } from "../../src/lib/scan/target-size";
import {
  attachFixGroups,
  buildBestPractice,
  buildIncomplete,
  elementSelectorsFor,
  enrichViolations,
  type AxeResults,
} from "../../src/lib/scan/violations";
import {
  buildCounts,
  buildFixFirst,
  buildSummary,
  computeScore,
  severityOrder,
} from "../../src/lib/scan/derive";
import { buildMarkers, markerTargets } from "../../src/lib/scan/markers";
import { SCORING_VERSION, scoredViolations } from "../../src/lib/scan/scored";
import type { ScanResult, ScanWarning } from "../../src/lib/scan/types";

export const UNAVAILABLE: ScanWarning[] = [
  {
    code: "keyboard-skipped",
    message: "The focus path needs real Tab presses, which this prototype does not do.",
  },
  {
    code: "contexts-skipped",
    message: "The mobile-viewport pass needs viewport emulation, not available in this prototype.",
  },
  {
    code: "audits-skipped",
    message: "The reduced-motion check needs media emulation, not available in this prototype.",
  },
  {
    code: "verification-skipped",
    message: "Fixes are not tested here: this prototype never writes to the audited page.",
  },
];

export async function auditActiveDocument(): Promise<ScanResult> {
  const startedAt = Date.now();

  const axe = (await runAxeInPage(AXE_TAGS)) as unknown as AxeResults;

  const wcagViolations = axe.violations.filter((v) => !v.tags.includes("best-practice"));
  const bpViolations = axe.violations.filter((v) => v.tags.includes("best-practice"));

  const elementInfos = collectElementInfo(elementSelectorsFor(wcagViolations));
  const enriched = enrichViolations(wcagViolations, elementInfos);
  attachFixGroups(enriched);

  const violations = enriched
    .map((e) => e.v)
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  const targets = markerTargets(wcagViolations);
  const markers = buildMarkers(
    targets,
    collectRects(targets.map((t) => t.selector)),
    readViewport(),
  );

  const audits = {
    targetSize: analyzeTargetSize(collectTargetSizeRaw(INTERACTIVE)),
    liveRegions: analyzeLiveRegions(collectLiveRegionsRaw()),
  };

  const scored = scoredViolations({ violations, audits });
  const counts = buildCounts(scored, {
    passed: axe.passes.length,
    bestPractice: bpViolations.length,
    manualReview: axe.incomplete.length,
  });

  return {
    url: location.href,
    finalUrl: location.href,
    title: document.title || location.href,
    scannedElements: axe.passes.length + axe.violations.length + axe.incomplete.length,
    durationMs: Date.now() - startedAt,
    scannedAt: new Date(startedAt).toISOString(),
    scoringVersion: SCORING_VERSION,
    screenshot: null,
    score: computeScore(scored),
    counts,
    summary: buildSummary(counts, { partial: true }),
    violations,
    incomplete: buildIncomplete(axe.incomplete),
    bestPractice: buildBestPractice(bpViolations),
    passed: axe.passes.map((p) => p.help),
    markers,
    audits,
    fixFirst: buildFixFirst(scored),
    partial: true,
    warnings: UNAVAILABLE,
  };
}

export const engine = {
  collectElementInfo,
  collectRects,
  collectLiveRegionsRaw,
  collectTargetSizeRaw,
  readViewport,
  INTERACTIVE,
};

declare global {
  interface Window {
    __accessCheckAudit?: () => Promise<ScanResult>;
    __accessCheckEngine?: typeof engine;
  }
}

window.__accessCheckAudit = auditActiveDocument;
window.__accessCheckEngine = engine;
