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
import type { ScanResult } from "../../src/lib/scan/types";
import { DOM_ENGINE_VERSION } from "../../src/lib/scan/dom/engine-api";
import { UNAVAILABLE, crossOriginWarning } from "./coverage";

export class EngineMissingError extends Error {}

function engine() {
  const dom = window.__accessCheckDom;
  if (!dom) {
    throw new EngineMissingError(
      "The AccessCheck audit engine was not injected into this page. Reload the extension and try again.",
    );
  }
  if (dom.version !== DOM_ENGINE_VERSION) {
    throw new EngineMissingError(
      `The audit engine in the page reports version ${dom.version}, this build needs ${DOM_ENGINE_VERSION}.`,
    );
  }
  return dom;
}

export async function auditActiveDocument(): Promise<ScanResult> {
  const startedAt = Date.now();
  const dom = engine();

  // This build may only touch the tab the reader clicked on, so it cannot fetch
  // a stylesheet or a media file from another origin. Asking axe to preload
  // them would spend a request that is certain to be refused; the checks that
  // depend on them land in manual review either way.
  const assets = dom.crossOriginAssets();
  const preload = assets.styleSheets === 0 && assets.media === 0;

  const axe = (await dom.runAxe(dom.AXE_TAGS, { preload })) as unknown as AxeResults;

  const wcagViolations = axe.violations.filter((v) => !v.tags.includes("best-practice"));
  const bpViolations = axe.violations.filter((v) => v.tags.includes("best-practice"));

  const elementInfos = dom.collectElementInfo(elementSelectorsFor(wcagViolations));
  const enriched = enrichViolations(wcagViolations, elementInfos);
  attachFixGroups(enriched);

  const violations = enriched
    .map((e) => e.v)
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  const targets = markerTargets(wcagViolations);
  const markers = buildMarkers(
    targets,
    dom.collectRects(targets.map((t) => t.selector)),
    dom.readViewport(),
  );

  const audits = {
    targetSize: analyzeTargetSize(dom.collectTargetSizeRaw(INTERACTIVE)),
    liveRegions: analyzeLiveRegions(dom.collectLiveRegionsRaw()),
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
    warnings: preload ? UNAVAILABLE : [...UNAVAILABLE, crossOriginWarning(assets)],
  };
}

declare global {
  interface Window {
    __accessCheckAudit?: () => Promise<ScanResult>;
  }
}

window.__accessCheckAudit = auditActiveDocument;
