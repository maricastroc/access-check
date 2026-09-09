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
  contentUnsettled,
  crossOriginWarning,
  unavailableWarnings,
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
import { translator, type Translate } from "../../src/lib/i18n/t";

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
  const dom = engine(translator());
  const prime = await dom.primeLazyContent();

  if (prime.steps === 0) return { prime, readiness: settled, calm: null };

  const readiness = await settleActiveDocument(POST_PRIME_SETTLE_MS);
  const calm = await dom.waitForPaintCalm(prime.animatingBefore, PAINT_CALM_MS);
  return { prime, readiness, calm };
}

function engine(t: Translate) {
  const dom = window.__accessCheckDom;
  if (!dom) throw new EngineMissingError(t("engine.missing"));
  if (dom.version !== DOM_ENGINE_VERSION) {
    throw new EngineMissingError(
      t("engine.versionMismatch", { found: dom.version, needed: DOM_ENGINE_VERSION }),
    );
  }
  return dom;
}

export async function auditActiveDocument(context: AuditContext = {}): Promise<ScanResult> {
  const locale = context.locale ?? DEFAULT_REPORT_LOCALE;
  const t = translator(locale);
  const dom = engine(t);
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
  const enriched = enrichViolations(wcagViolations, elementInfos, t);
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
    targetSize: analyzeTargetSize(dom.collectTargetSizeRaw(INTERACTIVE), t),
    liveRegions: analyzeLiveRegions(dom.collectLiveRegionsRaw(), t),
  };

  return withScoring({
    locale,
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
    incomplete: buildIncomplete(axe.incomplete, t),
    bestPractice: buildBestPractice(bpViolations),
    passed: axe.passes.map((p) => p.help),
    markers,
    audits,
    partial: true,
    warnings: [
      ...warningsAfterPriming(unavailableWarnings(t), context.primed === true),
      ...(preload ? [] : [crossOriginWarning(assets, t)]),
      ...(settled.settled ? [] : [contentUnsettled(t)]),
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
