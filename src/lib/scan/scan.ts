import path from "path";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { type ElementInfo } from "./remediate";
import { collectKeyboard, type FocusStop, type KeyboardReport } from "./keyboard";
import { collectContexts, type ContextReport } from "./contexts";
import { collectTargetSize } from "./target-size";
import { collectReducedMotion } from "./reduced-motion";
import { collectLiveRegions } from "./live-regions";
import type { AuditsReport } from "./audits";
import { buildCounts, buildFixFirst, buildSummary, computeScore, severityOrder } from "./derive";
import { Budget } from "./budget";
import { OPTIONAL_ORDER, ScanPolicy, STAGES, type StageId } from "./policy";
import { CONTENT_SIGNATURE, waitForContentReady } from "./page-ready";
import { AXE_TAGS } from "./dom/axe";
import type { DomRect } from "./dom/rects";
import { SCAN_VIEWPORT } from "./types";
import { DOM_ENGINE_VERSION } from "./dom/engine-api";
import type { ElementIdentity } from "./dom/identity";
import {
  buildMarkers,
  markerTargets,
  placeMarkers,
  type MarkerNumbers,
  type MarkerTarget,
} from "./markers";
import {
  findingAnchors,
  planCoverage,
  REGION_BUDGET,
  stopAnchors,
  type Coverage,
  type RegionBudget,
} from "./regions";
import { SCORING_VERSION, scoredViolations } from "./scored";
import {
  attachFixGroups,
  buildBestPractice,
  buildIncomplete,
  elementSelectorsFor,
  enrichViolations,
  identitySelectors,
  planVerification,
  type AxeResults,
} from "./violations";
import { captureScreenshot, SCREENSHOT_MIME, SCREENSHOT_QUALITY } from "./screenshot";
import { installNetworkGuard } from "./ssrf";
import type {
  FixVerification,
  RegionStop,
  ScanErrorCode,
  ScanMarker,
  ScanPhase,
  ScanRegion,
  ScanResult,
  ScanViolation,
  ScanWarningCode,
} from "./types";
import { axeLocaleFor } from "../i18n/axe-locale";
import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "../i18n/locale";
import { translator, type Translate } from "../i18n/t";

const VIEWPORT = SCAN_VIEWPORT;

const CONTEXT_OPTIONS = {
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  bypassCSP: true,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessCheckBot/2.1",
} as const;
const MAX_VERIFY_OPS = 40;

export const DEFAULT_SCAN_BUDGET_MS = 40_000;

const FINALIZE_RESERVE_MS = 2_500;
const FINALIZE_RESERVE_SHARE = 0.1;
const SESSION_MAX_MS = 18_000;
const RETRY_FLOOR_MS = 12_000;
const EXPIRED = Symbol("expired");

const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
const DOM_ENGINE_PATH = path.join(process.cwd(), "dom-engine/dom-engine.js");

export async function injectDomEngine(
  page: Page,
  enginePath = DOM_ENGINE_PATH,
  locale: ReportLocale = DEFAULT_REPORT_LOCALE,
): Promise<void> {
  const t = translator(locale);

  try {
    await page.addScriptTag({ path: enginePath });
  } catch (err) {
    throw new ScanFailure(
      t("scanFail.engineMissing", {
        path: enginePath,
        detail: err instanceof Error ? err.message : String(err),
      }),
      "internal",
    );
  }

  const version = await page.evaluate(() => window.__accessCheckDom?.version ?? null);
  if (version !== DOM_ENGINE_VERSION) {
    throw new ScanFailure(
      t("scanFail.engineVersion", { found: String(version), needed: DOM_ENGINE_VERSION }),
      "internal",
    );
  }
}

export class ScanFailure extends Error {
  constructor(
    message: string,
    readonly code: ScanErrorCode,
  ) {
    super(message);
    this.name = "ScanFailure";
  }
}

function warningText(t: Translate): Record<ScanWarningCode, string> {
  return {
    "screenshot-unavailable": t("scanWarning.screenshotUnavailable"),
    "fix-details-skipped": t("scanWarning.fixDetailsSkipped"),
    "markers-skipped": t("scanWarning.markersSkipped"),
    "content-unsettled": t("scanWarning.contentUnsettled"),
    "verification-skipped": t("scanWarning.verificationSkipped"),
    "audits-skipped": t("scanWarning.auditsSkipped"),
    "regions-skipped": t("scanWarning.regionsSkipped"),
    "reduced-motion-skipped": t("warning.reducedMotionSkipped"),
    "keyboard-skipped": t("scanWarning.keyboardSkipped"),
    "lazy-content-skipped": t("scanWarning.lazyContentSkipped"),
    "walk-changed-page": t("scanWarning.walkChangedPage"),
    "contexts-skipped": t("scanWarning.contextsSkipped"),
    "stream-interrupted": t("scanWarning.streamInterrupted"),
    "cross-origin-assets": t("scanWarning.crossOriginAssets"),
  };
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

async function primeLazyContent(page: Page): Promise<void> {
  await page.evaluate(() => window.__accessCheckDom!.primeLazyContent()).catch(() => {});
}

export type ScanOptions = {
  locale?: ReportLocale;
  screenshot?: boolean;
  keyboard?: boolean;
  contexts?: boolean;
  audits?: boolean;
  verifyFixes?: boolean;
  blockPrivateHosts?: boolean;
  budgetMs?: number;
  onPhase?: (phase: ScanPhase) => void;
  onCore?: (core: ScanResult) => void;
  onTimings?: (timings: Record<string, number>) => void;
};

const noop = (): void => undefined;

const BROWSER_GONE =
  /target (?:page, context or browser )?(?:has been )?closed|browser has been closed|browser has been disconnected|target crashed|session closed|protocol error/i;

class SessionOpenError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "SessionOpenError";
  }
}

class BrowserGoneError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "BrowserGoneError";
  }
}

function isBrowserGone(err: unknown): boolean {
  if (err instanceof BrowserGoneError) return true;
  return BROWSER_GONE.test(err instanceof Error ? err.message : String(err));
}

async function sessionIsGone(page: Page): Promise<boolean> {
  const CAP_MS = 2_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      page.evaluate(() => 1).then(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), CAP_MS);
      }),
    ]);
  } catch (probeErr) {
    return isBrowserGone(probeErr);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const REGION_SETTLE_MS = 250;

async function captureRegions(
  page: Page,
  input: {
    targets: MarkerTarget[];
    rects: (DomRect | null)[];
    stops: FocusStop[];
    markerNumbers: MarkerNumbers;
    budget: RegionBudget;
    onMarker: (markers: ScanMarker[]) => void;
  },
): Promise<{ regions: ScanRegion[]; coverage: Coverage } | undefined> {
  const page_ = await page.evaluate(() => ({
    docHeight: window.__accessCheckDom!.documentHeight(),
    stickyInset: window.__accessCheckDom!.stickyInset(),
    scrollY: Math.round(window.scrollY),
  }));

  const fromFindings = findingAnchors(input.targets, input.rects, VIEWPORT);
  const fromStops = stopAnchors(input.stops, VIEWPORT);

  const coverage = planCoverage(
    {
      anchors: [...fromFindings.anchors, ...fromStops.anchors],
      firstCapture: [...fromFindings.firstCapture, ...fromStops.firstCapture],
      unanchorable: [...fromFindings.unanchorable, ...fromStops.unanchorable],
    },
    { viewport: VIEWPORT, docHeight: page_.docHeight, stickyInset: page_.stickyInset },
    input.budget,
  );

  if (coverage.regions.length === 0) return { regions: [], coverage };

  const stopSelectors = input.stops.map((stop) => stop.selector);
  const regions: ScanRegion[] = [];
  const startedAt = Date.now();
  let spentBytes = 0;

  try {
    for (const planned of coverage.regions) {
      if (planned.missed) {
        regions.push({ ...bare(planned), image: null, stops: [] });
        continue;
      }
      if (Date.now() - startedAt > input.budget.maxMs) {
        regions.push({ ...bare(planned), image: null, missed: "time", stops: [] });
        continue;
      }

      const landedAt = await page.evaluate(
        (docY) => window.__accessCheckDom!.scrollToDocY(docY),
        planned.docY,
      );
      await page.waitForTimeout(REGION_SETTLE_MS);

      const [freshTargets, freshStops] = await Promise.all([
        page.evaluate(
          (selectors) => window.__accessCheckDom!.collectRects(selectors),
          input.targets.map((t) => t.selector),
        ),
        page.evaluate(
          (selectors) => window.__accessCheckDom!.collectRects(selectors),
          stopSelectors,
        ),
      ]);

      const shot = await page
        .screenshot({
          type: "jpeg",
          quality: SCREENSHOT_QUALITY,
          clip: { x: 0, y: 0, ...VIEWPORT },
          animations: "disabled",
        })
        .catch(() => null);

      if (!shot) {
        regions.push({ ...bare(planned), image: null, missed: "failed", stops: [] });
        continue;
      }

      const image = `data:${SCREENSHOT_MIME};base64,${shot.toString("base64")}`;
      spentBytes += image.length;
      if (spentBytes > input.budget.maxBytes) {
        regions.push({ ...bare(planned), image: null, missed: "bytes", stops: [] });
        break;
      }

      input.onMarker(
        placeMarkers(input.targets, freshTargets, VIEWPORT, planned.id, input.markerNumbers),
      );

      regions.push({
        ...bare(planned),
        docY: landedAt,
        image,
        stops: placeStops(input.stops, freshStops, VIEWPORT),
      });
    }
  } finally {
    await page
      .evaluate((y) => window.__accessCheckDom!.scrollToDocY(y), page_.scrollY)
      .catch(() => null);
  }

  return { regions, coverage: { ...coverage, ...recount(coverage, regions) } };
}

function bare(planned: Coverage["regions"][number]): Omit<ScanRegion, "image" | "stops"> {
  return {
    id: planned.id,
    docY: planned.docY,
    width: planned.width,
    height: planned.height,
    ...(planned.missed ? { missed: planned.missed } : {}),
  };
}

function placeStops(
  stops: FocusStop[],
  rects: (DomRect | null)[],
  viewport: { width: number; height: number },
): RegionStop[] {
  const placed: RegionStop[] = [];

  stops.forEach((stop, i) => {
    const r = rects[i];
    if (!r || r.w === 0 || r.h === 0 || r.scrolled) return;
    if (r.y < 0 || r.y > viewport.height || r.x < 0 || r.x > viewport.width) return;

    const top = Math.max(0, r.y);
    const height = Math.min(r.h - (top - r.y), viewport.height - top);
    placed.push({
      n: stop.n,
      left: (r.x / viewport.width) * 100,
      top: (top / viewport.height) * 100,
      width: (r.w / viewport.width) * 100,
      height: (Math.max(height, 4) / viewport.height) * 100,
    });
  });

  return placed;
}

function recount(
  coverage: Coverage,
  regions: ScanRegion[],
): Pick<Coverage, "covered" | "uncovered"> {
  const missed = new Map(regions.map((r) => [r.id, r.missed]));
  const covered: Coverage["covered"] = [];
  const uncovered: Coverage["uncovered"] = coverage.uncovered.filter(
    (u) => u.reason === "inside-scroller" || u.reason === "unplaced",
  );

  for (const planned of coverage.regions) {
    const reason = missed.get(planned.id);
    for (const held of planned.holds) {
      if (reason) uncovered.push({ ...held, reason });
      else covered.push({ ...held, regionId: planned.id });
    }
  }

  return { covered, uncovered };
}

export async function runScan(rawUrl: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_SCAN_BUDGET_MS;
  const budget = new Budget(
    budgetMs,
    Math.min(FINALIZE_RESERVE_MS, Math.round(budgetMs * FINALIZE_RESERVE_SHARE)),
  );
  const timings: Record<string, number> = {};
  const locale = opts.locale ?? DEFAULT_REPORT_LOCALE;

  const unavailable = () =>
    new ScanFailure(translator(locale)("scanFail.browserUnavailable"), "browser-unavailable");

  try {
    try {
      return await runScanAttempt(rawUrl, opts, budget, timings);
    } catch (err) {
      if (err instanceof SessionOpenError) throw err.cause;
      if (!isBrowserGone(err)) throw err;
      await closeSharedBrowser().catch(() => noop());
      if (!budget.allows(RETRY_FLOOR_MS)) throw unavailable();
      timings.browserRestarted = (timings.browserRestarted ?? 0) + 1;
      try {
        return await runScanAttempt(rawUrl, opts, budget, timings);
      } catch (retryErr) {
        if (retryErr instanceof SessionOpenError) throw retryErr.cause;
        if (isBrowserGone(retryErr)) throw unavailable();
        throw retryErr;
      }
    }
  } finally {
    try {
      opts.onTimings?.(timings);
    } catch {
      noop();
    }
  }
}

async function runScanAttempt(
  rawUrl: string,
  opts: ScanOptions,
  budget: Budget,
  timings: Record<string, number>,
): Promise<ScanResult> {
  const {
    locale = DEFAULT_REPORT_LOCALE,
    screenshot: doScreenshot = true,
    keyboard: doKeyboard = true,
    contexts: doContexts = true,
    audits: doAudits = true,
    verifyFixes: doVerify = true,
    blockPrivateHosts = false,
    onPhase,
    onCore,
  } = opts;

  const url = normalizeUrl(rawUrl);
  const startedAt = Date.now();
  const policy = new ScanPolicy(budget, warningText(translator(locale)));

  const track = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      timings[label] = Date.now() - t0;
    }
  };

  const phase = (p: ScanPhase) => {
    try {
      onPhase?.(p);
    } catch {
      noop();
    }
  };

  phase("preparing");

  const openSession = async (): Promise<{ context: BrowserContext; page: Page }> => {
    for (let attempt = 1; ; attempt++) {
      let context: BrowserContext | undefined;
      const allowance = Math.max(3_000, budget.slice(SESSION_MAX_MS));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const expiry = new Promise<typeof EXPIRED>((resolve) => {
        timer = setTimeout(() => resolve(EXPIRED), allowance);
      });
      try {
        const attempted = (async () => {
          const browser = await track("browserLaunch", () => acquireBrowser());
          context = await track("contextCreate", () => browser.newContext(CONTEXT_OPTIONS));
          if (blockPrivateHosts) await installNetworkGuard(context);
          const page = await track("pageCreate", () => context!.newPage());
          return { context, page };
        })();
        attempted.catch(() => noop());

        const opened = await Promise.race([attempted, expiry]);
        if (opened !== EXPIRED) return opened;

        await context?.close().catch(() => noop());
        await closeSharedBrowser().catch(() => noop());
        throw new ScanFailure(translator(locale)("scanFail.browserSlow"), "browser-unavailable");
      } catch (err) {
        if (err instanceof ScanFailure) throw err;
        await context?.close().catch(() => noop());
        await closeSharedBrowser().catch(() => noop());
        if (attempt >= 2) throw err;
        timings.browserRecycled = (timings.browserRecycled ?? 0) + 1;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };

  const { context, page } = await openSession().catch((err: unknown) => {
    throw err instanceof ScanFailure ? err : new SessionOpenError(err);
  });

  try {
    phase("loading");

    const navTimeout = Math.max(STAGES.navigation.minMs, policy.allowance("navigation"));
    const response = await track("navigation", () =>
      page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeout }).catch(async (err) => {
        if (isBrowserGone(err)) throw err;
        const message = err instanceof Error ? err.message : String(err);

        if (/timeout/i.test(message)) {
          throw new ScanFailure(
            translator(locale)("scanFail.navigationTimeout", {
              seconds: Math.round(navTimeout / 1000),
            }),
            "navigation-timeout",
          );
        }
        if (await sessionIsGone(page)) throw new BrowserGoneError(err);
        throw new ScanFailure(translator(locale)("scanFail.unreachable"), "navigation-failed");
      }),
    );

    const httpStatus = response?.status() ?? 0;
    if (httpStatus >= 400) {
      throw new ScanFailure(
        translator(locale)("scanFail.httpError", { status: httpStatus }),
        "http-error",
      );
    }

    await track("engine", () => injectDomEngine(page, DOM_ENGINE_PATH, locale));

    await track("prime", () => policy.run("prime", () => primeLazyContent(page), undefined));

    const readiness = await track("contentReady", () =>
      policy.run(
        "content-ready",
        (allowanceMs) =>
          waitForContentReady(
            () => page.evaluate(CONTENT_SIGNATURE).catch(() => null),
            (ms) => page.waitForTimeout(ms),
            { maxMs: allowanceMs },
          ),
        { ms: 0, settled: false, samples: 0 },
      ),
    );
    if (!readiness.value.settled) policy.skip("content-ready");

    const title = (await page.title().catch(() => "")) || url;
    const finalUrl = page.url();

    phase("auditing");

    const runAxe = async (): Promise<AxeResults> => {
      await page.addScriptTag({ path: AXE_PATH });
      return page.evaluate(
        ([tags, axeLocale]) => window.__accessCheckDom!.runAxe(tags, { locale: axeLocale }),
        [AXE_TAGS, axeLocaleFor(locale)] as const,
      );
    };

    const axe = await track("axe", async (): Promise<AxeResults | null> => {
      if (!policy.canRun("axe")) return null;
      const first = await policy.run<AxeResults | null>("axe", runAxe, null);
      if (first.value) return first.value;
      if (first.timedOut || !policy.canRun("axe")) return null;
      await page
        .waitForLoadState("domcontentloaded", { timeout: Math.min(3_000, budget.spendable()) })
        .catch(() => null);
      const second = await policy.run<AxeResults | null>("axe", runAxe, null);
      return second.value;
    });

    if (!axe) {
      throw new ScanFailure(translator(locale)("scanFail.timeout"), "audit-failed");
    }

    phase("processing");

    const wcagViolations = axe.violations.filter((v) => !v.tags.includes("best-practice"));
    const bpViolations = axe.violations.filter((v) => v.tags.includes("best-practice"));

    const elementSelectors = elementSelectorsFor(wcagViolations);

    const elementInfos: Record<string, ElementInfo> =
      elementSelectors.length === 0
        ? {}
        : (
            await policy.run<Record<string, ElementInfo>>(
              "element-info",
              () =>
                page.evaluate(
                  (selectors) => window.__accessCheckDom!.collectElementInfo(selectors),
                  elementSelectors,
                ),
              {},
            )
          ).value;

    const enriched = enrichViolations(wcagViolations, elementInfos, translator(locale));

    const applyFixGroups = () => attachFixGroups(enriched);

    const verifyFixes = async () => {
      if (!doVerify) return;

      const { ops: verifyOps, clusters: opClusters } = planVerification(enriched, MAX_VERIFY_OPS);
      if (verifyOps.length === 0) return;

      const outcome = await track("verify", () =>
        policy.run(
          "verify",
          () => page.evaluate((ops) => window.__accessCheckDom!.verifyFixes(ops), verifyOps),
          [] as FixVerification[],
        ),
      );
      if (outcome.skipped || outcome.timedOut) return;

      outcome.value.forEach((res, i) => {
        opClusters[i].verification = res;
      });
      applyFixGroups();
    };

    applyFixGroups();

    const violations: ScanViolation[] = enriched
      .map((e) => e.v)
      .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

    const targets = markerTargets(wcagViolations);

    const rects = (
      await policy.run<(DomRect | null)[]>(
        "markers",
        () =>
          page.evaluate(
            (selectors) => window.__accessCheckDom!.collectRects(selectors),
            targets.map((t) => t.selector),
          ),
        targets.map(() => null),
      )
    ).value;

    const markerNumbers: MarkerNumbers = new Map();
    const markers = buildMarkers(targets, rects, VIEWPORT, markerNumbers);

    const counts = buildCounts(violations, {
      passed: axe.passes.length,
      bestPractice: bpViolations.length,
      manualReview: axe.incomplete.length,
    });

    const passed = axe.passes.map((p) => p.help);

    const bestPractice = buildBestPractice(bpViolations);
    const incomplete = buildIncomplete(axe.incomplete, translator(locale));

    const identities: Record<string, ElementIdentity> = {};

    const identify = async (selectors: string[]) => {
      if (selectors.length === 0) return;
      const collected = await policy.run<Record<string, ElementIdentity>>(
        "element-info",
        () =>
          page.evaluate(
            (list) => window.__accessCheckDom!.collectIdentities(list),
            selectors.filter((selector) => !(selector in identities)),
          ),
        {},
      );
      Object.assign(identities, collected.value);
    };

    await identify(
      identitySelectors(violations, [
        ...bestPractice.flatMap((bp) => bp.selectors),
        ...incomplete.flatMap((inc) => inc.selectors),
      ]),
    );

    phase("finalizing");
    const core: ScanResult = {
      locale,
      url,
      finalUrl,
      title,
      scannedElements: axe.passes.length + axe.violations.length + axe.incomplete.length,
      durationMs: Date.now() - startedAt,
      scannedAt: new Date(startedAt).toISOString(),
      scoringVersion: SCORING_VERSION,
      screenshot: null,
      score: computeScore(violations),
      counts,
      summary: buildSummary(counts, translator(locale)),
      violations,
      incomplete,
      bestPractice,
      passed,
      markers,
      identities,
      fixFirst: buildFixFirst(violations),
      partial: policy.partial,
      warnings: policy.warnings().length > 0 ? policy.warnings() : undefined,
    };

    policy.releaseAssemblyReserve();

    try {
      onCore?.(core);
    } catch {
      noop();
    }

    let screenshot: string | null = null;
    let regions: ScanRegion[] | undefined;
    let coverage: Coverage | undefined;
    let audits: AuditsReport | undefined;
    let keyboard: KeyboardReport | undefined;
    let contexts: ContextReport | undefined;

    const runOptional: Record<StageId, () => Promise<void>> = {
      verify: verifyFixes,

      audits: async () => {
        const collected = await track("audits", () =>
          policy.run(
            "audits",
            async () => {
              const report: AuditsReport = {};
              report.targetSize = await collectTargetSize(page, translator(locale));
              report.reducedMotion = await collectReducedMotion(page, translator(locale));
              report.liveRegions = await collectLiveRegions(page, translator(locale));
              return report;
            },
            undefined as AuditsReport | undefined,
          ),
        );
        audits = collected.value;
        if (collected.timedOut || (collected.ran && !collected.value)) policy.skip("audits");
        if (audits) {
          await identify([
            ...(audits.targetSize?.findings ?? []).flatMap((f) => f.selectors),
            ...(audits.liveRegions?.findings ?? []).flatMap((f) => f.selectors),
            ...(audits.reducedMotion?.findings ?? []).flatMap((f) => f.selectors),
          ]);
        }
      },

      screenshot: async () => {
        const shot = await track("screenshot", () =>
          policy.run<string | null>(
            "screenshot",
            (allowanceMs) =>
              captureScreenshot(
                (timeoutMs) =>
                  page.screenshot({
                    type: "jpeg",
                    quality: SCREENSHOT_QUALITY,
                    clip: { x: 0, y: 0, ...VIEWPORT },
                    animations: "disabled",
                    timeout: timeoutMs,
                  }),
                allowanceMs,
              ),
            null,
          ),
        );
        screenshot = shot.value;
        if (!screenshot) policy.skip("screenshot");
      },

      keyboard: async () => {
        const collected = await track("keyboard", () =>
          policy.run<KeyboardReport | undefined>(
            "keyboard",
            (allowanceMs) =>
              collectKeyboard(page, VIEWPORT, translator(locale), { maxMs: allowanceMs * 0.75 }),
            undefined,
          ),
        );
        keyboard = collected.value;
        if (!keyboard) policy.skip("keyboard");
      },

      contexts: async () => {
        const collected = await track("contexts", () =>
          policy.run<ContextReport | undefined>(
            "contexts",
            (allowanceMs) =>
              collectContexts(
                page,
                violations.map((v) => v.id),
                translator(locale),
                { maxMs: allowanceMs * 0.8 },
              ),
            undefined,
          ),
        );
        contexts = collected.value;
        if (!contexts) policy.skip("contexts");
      },

      regions: async () => {
        const collected = await track("regions", () =>
          policy.run<{ regions: ScanRegion[]; coverage: Coverage } | undefined>(
            "regions",
            (allowanceMs) =>
              captureRegions(page, {
                targets,
                rects,
                stops: keyboard?.focusPath ?? [],
                markerNumbers,
                budget: { ...REGION_BUDGET, maxMs: Math.min(REGION_BUDGET.maxMs, allowanceMs) },
                onMarker: (found) => markers.push(...found),
              }),
            undefined,
          ),
        );
        if (!collected.value) {
          if (collected.timedOut) policy.skip("regions");
          return;
        }
        regions = collected.value.regions;
        coverage = collected.value.coverage;
        if (regions.some((r) => r.missed)) policy.warn("regions-skipped");
      },

      navigation: async () => noop(),
      prime: async () => noop(),
      "content-ready": async () => noop(),
      axe: async () => noop(),
      "element-info": async () => noop(),
      markers: async () => noop(),
    };

    const wanted: Record<string, boolean> = {
      regions: doKeyboard || doScreenshot,
      verify: doVerify,
      audits: doAudits,
      screenshot: doScreenshot,
      keyboard: doKeyboard,
      contexts: doContexts,
    };

    for (const stage of OPTIONAL_ORDER) {
      if (!wanted[stage]) continue;
      if (!policy.canRun(stage)) {
        policy.skip(stage);
        continue;
      }
      await runOptional[stage]();
    }

    const scored = scoredViolations({ violations, keyboard, audits, contexts });
    const finalCounts = buildCounts(scored, {
      passed: axe.passes.length,
      bestPractice: bpViolations.length,
      manualReview: axe.incomplete.length,
    });

    void coverage;

    return {
      ...core,
      markers,
      regions,
      durationMs: Date.now() - startedAt,
      screenshot,
      keyboard,
      contexts,
      audits,
      score: computeScore(scored),
      counts: finalCounts,
      summary: buildSummary(finalCounts, translator(locale), { partial: policy.partial }),
      fixFirst: buildFixFirst(scored),
      partial: policy.partial,
      warnings: policy.warnings().length > 0 ? policy.warnings() : undefined,
    };
  } finally {
    timings.total = Date.now() - startedAt;
    await context.close().catch(() => noop());
  }
}
