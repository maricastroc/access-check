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
import { severityOrder } from "../../src/lib/scan/derive";
import { buildMarkers, markerTargets } from "../../src/lib/scan/markers";
import { SCORING_VERSION, withScoring } from "../../src/lib/scan/scored";
import type { ScanResult } from "../../src/lib/scan/types";
import { DOM_ENGINE_VERSION } from "../../src/lib/scan/dom/engine-api";
import {
  CONTENT_UNSETTLED,
  UNAVAILABLE,
  crossOriginWarning,
  warningsAfterPriming,
} from "./coverage";
import {
  CONTENT_SIGNATURE,
  waitForContentReady,
  type ContentReadiness,
} from "../../src/lib/scan/page-ready";
import type { PaintCalm, PrimeReport } from "../../src/lib/scan/dom/prime";
import type { Locale } from "axe-core";
import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "../../src/lib/i18n/locale";

export class EngineMissingError extends Error {}

const SETTLE_MS = 6_000;

const POST_PRIME_SETTLE_MS = 3_000;

const PAINT_CALM_MS = 2_000;

export type AuditContext = {
  readiness?: ContentReadiness;
  primed?: boolean;
  axeLocale?: Locale | null;
  locale?: ReportLocale;
};

export function settleActiveDocument(maxMs = SETTLE_MS): Promise<ContentReadiness> {
  return waitForContentReady(
    async () => CONTENT_SIGNATURE(),
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    { maxMs },
  );
}

export async function primeActiveDocument(settled: ContentReadiness): Promise<{
  prime: PrimeReport;
  readiness: ContentReadiness;
  calm: PaintCalm | null;
}> {
  const dom = engine();
  const prime = await dom.primeLazyContent();

  if (prime.steps === 0) return { prime, readiness: settled, calm: null };

  const readiness = await settleActiveDocument(POST_PRIME_SETTLE_MS);
  const calm = await dom.waitForPaintCalm(prime.animatingBefore, PAINT_CALM_MS);
  return { prime, readiness, calm };
}

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

export async function auditActiveDocument(context: AuditContext = {}): Promise<ScanResult> {
  const dom = engine();
  dom.overlayClear();

  const settled = context.readiness ?? (await settleActiveDocument());
  const startedAt = Date.now();

  const assets = dom.crossOriginAssets();
  const preload = assets.styleSheets === 0 && assets.media === 0;

  const axe = (await dom.runAxe(dom.AXE_TAGS, {
    preload,
    locale: context.axeLocale,
  })) as unknown as AxeResults;

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

  return withScoring({
    locale: context.locale ?? DEFAULT_REPORT_LOCALE,
    url: location.href,
    finalUrl: location.href,
    title: document.title || location.href,
    scannedElements: axe.passes.length + axe.violations.length + axe.incomplete.length,
    durationMs: Date.now() - startedAt,
    scannedAt: new Date(startedAt).toISOString(),
    scoringVersion: SCORING_VERSION,
    screenshot: null,
    counts: {
      passed: axe.passes.length,
      bestPractice: bpViolations.length,
      manualReview: axe.incomplete.length,
    },
    violations,
    incomplete: buildIncomplete(axe.incomplete),
    bestPractice: buildBestPractice(bpViolations),
    passed: axe.passes.map((p) => p.help),
    markers,
    audits,
    partial: true,
    warnings: [
      ...warningsAfterPriming(UNAVAILABLE, context.primed === true),
      ...(preload ? [] : [crossOriginWarning(assets)]),
      ...(settled.settled ? [] : [CONTENT_UNSETTLED]),
    ],
  });
}

declare global {
  interface Window {
    __accessCheckAudit?: (context?: AuditContext) => Promise<ScanResult>;
    __accessCheckSettle?: () => Promise<ContentReadiness>;
    __accessCheckPrime?: (
      settled: ContentReadiness,
    ) => Promise<{ prime: PrimeReport; readiness: ContentReadiness; calm: PaintCalm | null }>;
  }
}

window.__accessCheckAudit = auditActiveDocument;
window.__accessCheckSettle = () => settleActiveDocument();
window.__accessCheckPrime = primeActiveDocument;
