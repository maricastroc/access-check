import path from "path";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { type ElementInfo, type FixApply } from "./remediate";
import type { FixCluster } from "./group";
import { collectKeyboard, type KeyboardReport } from "./keyboard";
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
import type { DocRect } from "./dom/rects";
import { DOM_ENGINE_VERSION } from "./dom/engine-api";
import {
  buildMarkers,
  centeredMargin,
  numberTargets,
  overviewMarkers,
  markerTargets,
  orderByDocument,
  fitsViewport,
  markerFromCrop,
  unavailableMarker,
  MAX_CAPTURE_CHARS,
  MAX_EXTRA_CAPTURES,
  type MarkerTarget,
} from "./markers";
import { SCORING_VERSION, scoredViolations } from "./scored";
import {
  attachFixGroups,
  buildBestPractice,
  buildIncomplete,
  elementSelectorsFor,
  enrichViolations,
  type AxeResults,
} from "./violations";
import { captureScreenshot, SCREENSHOT_QUALITY } from "./screenshot";
import { captureOverview, MAX_OVERVIEW_MS } from "./overview";
import { installNetworkGuard } from "./ssrf";
import type {
  ScanCapture,
  ScanOverview,
  ScanMarker,
  FixVerification,
  ScanErrorCode,
  ScanPhase,
  ScanResult,
  ScanViolation,
  ScanWarningCode,
} from "./types";
import { axeLocaleFor } from "../i18n/axe-locale";
import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "../i18n/locale";
import { translator, type Translate } from "../i18n/t";

const VIEWPORT = { width: 1200, height: 800 };

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

type VerifyOp = { ruleId: string; selector: string | null; apply: FixApply };

const VERIFY_IN_PAGE = async (ops: VerifyOp[]): Promise<FixVerification[]> => {
  const axe = window.axe;

  const runRule = async (context: Element | Document, ruleId: string): Promise<boolean> => {
    const res = await axe.run(context, {
      runOnly: { type: "rule", values: [ruleId] },
    });
    return res.violations.length === 0;
  };

  const results: FixVerification[] = [];
  {
    for (const op of ops) {
      try {
        const a = op.apply;
        if (a.kind === "doc" && a.target === "lang") {
          const el = document.documentElement;
          const prev = el.getAttribute("lang");
          el.setAttribute("lang", a.value);
          const ok = await runRule(document, op.ruleId);
          if (prev === null) el.removeAttribute("lang");
          else el.setAttribute("lang", prev);
          results.push(ok ? "verified" : "failed");
        } else if (a.kind === "doc" && a.target === "title") {
          const prev = document.title;
          document.title = a.value;
          const ok = await runRule(document, op.ruleId);
          document.title = prev;
          results.push(ok ? "verified" : "failed");
        } else if (a.kind === "viewport") {
          let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
          const created = !meta;
          const prev = meta?.getAttribute("content") ?? null;
          if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "viewport");
            document.head.appendChild(meta);
          }
          meta.setAttribute("content", a.value);
          const ok = await runRule(document, op.ruleId);
          if (created) meta.remove();
          else if (prev !== null) meta.setAttribute("content", prev);
          results.push(ok ? "verified" : "failed");
        } else if (op.selector) {
          const el = document.querySelector(op.selector);
          if (!el) {
            results.push("unchecked");
            continue;
          }
          if (a.kind === "attr") {
            const prev = el.getAttribute(a.name);
            el.setAttribute(a.name, a.value);
            const ok = await runRule(el, op.ruleId);
            if (prev === null) el.removeAttribute(a.name);
            else el.setAttribute(a.name, prev);
            results.push(ok ? "verified" : "failed");
          } else if (a.kind === "style") {
            const style = (el as HTMLElement).style;
            const prev = style.getPropertyValue(a.prop);
            const prevPrio = style.getPropertyPriority(a.prop);
            style.setProperty(a.prop, a.value, "important");
            const ok = await runRule(el, op.ruleId);
            if (prev) style.setProperty(a.prop, prev, prevPrio);
            else style.removeProperty(a.prop);
            results.push(ok ? "verified" : "failed");
          } else {
            results.push("unchecked");
          }
        } else {
          results.push("unchecked");
        }
      } catch {
        results.push("unchecked");
      }
    }
  }
  return results;
};

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

const CROP_SETTLE_MS = 250;

async function captureEvidenceCrops(
  page: Page,
  targets: MarkerTarget[],
  numbered: number[],
  onOverview: Set<number>,
  viewport: { width: number; height: number },
  deadline: number,
): Promise<{ captures: ScanCapture[]; markers: ScanMarker[] }> {
  const captures: ScanCapture[] = [];
  const markers: ScanMarker[] = [];
  const pending = new Set(numbered);
  const numberOf = new Map(numbered.map((index, position) => [index, position + 1]));
  let budget = MAX_CAPTURE_CHARS;

  const docRects = await page.evaluate(
    (sels) => window.__accessCheckDom!.collectDocRects(sels),
    targets.map((t) => t.selector),
  );

  for (const index of orderByDocument(numbered, docRects)) {
    if (!pending.has(index)) continue;
    if (captures.length >= MAX_EXTRA_CAPTURES || Date.now() > deadline) break;

    const anchor = docRects[index];
    if (!anchor) continue;

    const inset = await page.evaluate(() => window.__accessCheckDom!.stickyInset());
    const topMargin = centeredMargin(anchor.h, viewport, inset);
    const scrolledTo = await page.evaluate(
      ([docY, margin]) => window.__accessCheckDom!.scrollToDocY(docY, margin),
      [anchor.docY, topMargin] as const,
    );
    await page.waitForTimeout(CROP_SETTLE_MS);

    const atEnd = scrolledTo < Math.round(anchor.docY - topMargin);

    const members = [...pending];
    const rects = await page.evaluate(
      (sels) => window.__accessCheckDom!.collectRects(sels),
      members.map((i) => targets[i].selector),
    );

    const placed = members
      .map((i, k) => ({ index: i, rect: rects[k] }))
      .filter((x) => x.rect && fitsViewport(x.rect, viewport, atEnd))
      .sort((a, b) => a.rect!.y - b.rect!.y);

    if (placed.length === 0) continue;

    const shot = await page
      .screenshot({
        type: "jpeg",
        quality: SCREENSHOT_QUALITY,
        clip: { x: 0, y: 0, ...viewport },
        animations: "disabled",
        timeout: Math.max(1_000, Math.min(6_000, deadline - Date.now())),
      })
      .catch(() => null);

    if (!shot) continue;

    const image = `data:image/jpeg;base64,${shot.toString("base64")}`;
    if (image.length > budget) break;
    budget -= image.length;

    const captureId = `c${captures.length + 1}`;
    captures.push({
      id: captureId,
      image,
      width: viewport.width,
      height: viewport.height,
      docY: scrolledTo,
    });

    for (const { index: i, rect } of placed) {
      markers.push(
        markerFromCrop(
          targets[i],
          rect!,
          viewport,
          numberOf.get(i)!,
          captureId,
          i === index ? "captured" : "shared",
        ),
      );
      pending.delete(i);
    }
  }

  for (const index of pending) {
    if (onOverview.has(index)) continue;
    markers.push(unavailableMarker(targets[index], numberOf.get(index)!));
  }

  return { captures, markers };
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

      const verifyOps: VerifyOp[] = [];
      const opClusters: FixCluster[] = [];
      for (const e of enriched) {
        for (const cluster of e.clusters) {
          if (verifyOps.length >= MAX_VERIFY_OPS) break;
          if (!cluster.apply) continue;
          const docLevel = cluster.apply.kind === "doc" || cluster.apply.kind === "viewport";
          const selector = docLevel ? null : (cluster.selectors[0] ?? null);
          if (!docLevel && !selector) continue;
          verifyOps.push({ ruleId: e.v.id, selector, apply: cluster.apply });
          opClusters.push(cluster);
        }
      }
      if (verifyOps.length === 0) return;

      const outcome = await track("verify", () =>
        policy.run(
          "verify",
          () => page.evaluate(VERIFY_IN_PAGE, verifyOps),
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
      await policy.run<(DocRect | null)[]>(
        "markers",
        () =>
          page.evaluate(
            (selectors) => window.__accessCheckDom!.collectDocRects(selectors),
            targets.map((t) => t.selector),
          ),
        targets.map(() => null),
      )
    ).value;

    const markers = buildMarkers(targets, rects, VIEWPORT);

    const counts = buildCounts(violations, {
      passed: axe.passes.length,
      bestPractice: bpViolations.length,
      manualReview: axe.incomplete.length,
    });

    const passed = axe.passes.map((p) => p.help);

    const bestPractice = buildBestPractice(bpViolations);
    const incomplete = buildIncomplete(axe.incomplete, translator(locale));

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
    let overview: ScanOverview | undefined;
    let pageMarkers: ScanMarker[] = markers;
    let captures: ScanCapture[] = [];
    let extraMarkers: ScanMarker[] = [];
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

        if (!screenshot) return;

        const view = await track("overview", () =>
          captureOverview(page, {
            viewport: VIEWPORT,
            quality: SCREENSHOT_QUALITY,
            deadline:
              Date.now() + Math.min(MAX_OVERVIEW_MS, Math.max(0, budget.remaining() - 6_000)),
          }).catch(() => undefined),
        );

        const numbered = numberTargets(targets, rects);
        pageMarkers = buildMarkers(targets, rects, VIEWPORT, numbered);

        if (view && view.capturedHeight > 0) {
          overview = view;
          pageMarkers = overviewMarkers(
            targets,
            rects,
            { width: view.pageWidth, height: view.capturedHeight },
            numbered,
          );
        }

        if (numbered.length > 0) {
          const onOverview = new Set(
            numbered.filter((_, position) =>
              pageMarkers.some((marker) => marker.n === position + 1),
            ),
          );

          const cropped = await track("captures", () =>
            captureEvidenceCrops(
              page,
              targets,
              numbered,
              onOverview,
              VIEWPORT,
              Date.now() + Math.min(8_000, Math.max(0, budget.remaining() - 4_000)),
            ).catch(() => ({ captures: [], markers: [] })),
          );
          captures = cropped.captures;
          extraMarkers = cropped.markers;
        }
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

      navigation: async () => noop(),
      prime: async () => noop(),
      "content-ready": async () => noop(),
      axe: async () => noop(),
      "element-info": async () => noop(),
      markers: async () => noop(),
    };

    const wanted: Record<string, boolean> = {
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

    return {
      ...core,
      durationMs: Date.now() - startedAt,
      screenshot,
      markers: [...pageMarkers, ...extraMarkers],
      captures,
      overview,
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
