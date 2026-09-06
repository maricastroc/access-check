import path from "path";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { criterionFromTags } from "./wcag";
import {
  fixAriaAllowedAttr,
  fixAriaName,
  fixAriaRequiredAttr,
  fixContrast,
  fixDocumentTitle,
  fixHtmlLang,
  fixImageAlt,
  fixLabel,
  fixMetaViewport,
  type ElementInfo,
  type FixApply,
  type FixResult,
} from "./remediate";
import { clusterFixes, type FixCluster } from "./group";
import { collectKeyboard, type KeyboardReport } from "./keyboard";
import { collectContexts, type ContextReport } from "./contexts";
import { collectTargetSize } from "./target-size";
import { collectReducedMotion } from "./reduced-motion";
import { collectLiveRegions } from "./live-regions";
import type { AuditsReport } from "./audits";
import { buildFixFirst, buildSummary, computeScore, severityOrder } from "./derive";
import { Budget } from "./budget";
import { OPTIONAL_ORDER, ScanPolicy, STAGES, type StageId } from "./policy";
import { CONTENT_SIGNATURE, waitForContentReady } from "./page-ready";
import { captureScreenshot, SCREENSHOT_QUALITY } from "./screenshot";
import { installNetworkGuard } from "./ssrf";
import type {
  FixGroup,
  FixVerification,
  ScanErrorCode,
  ScanMarker,
  ScanPhase,
  ScanResult,
  ScanViolation,
  ScanWarningCode,
  Severity,
} from "./types";

const VIEWPORT = { width: 1200, height: 800 };

const CONTEXT_OPTIONS = {
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  bypassCSP: true,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessCheckBot/2.1",
} as const;
const MAX_MARKERS = 6;
const MAX_VERIFY_OPS = 40;

export const DEFAULT_SCAN_BUDGET_MS = 40_000;

const FINALIZE_RESERVE_MS = 2_500;
const FINALIZE_RESERVE_SHARE = 0.1;
const SESSION_MAX_MS = 18_000;
const RETRY_FLOOR_MS = 12_000;
const EXPIRED = Symbol("expired");

const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

export class ScanFailure extends Error {
  constructor(
    message: string,
    readonly code: ScanErrorCode,
  ) {
    super(message);
    this.name = "ScanFailure";
  }
}

const WARNING_TEXT: Record<ScanWarningCode, string> = {
  "screenshot-unavailable": "The screenshot could not be taken in time.",
  "fix-details-skipped": "Some findings show general guidance instead of a specific suggested fix.",
  "markers-skipped": "The markers could not be placed on the screenshot.",
  "content-unsettled": "The page was still loading when the audit ran.",
  "verification-skipped": "Fixes were not tested on a copy of the page this time.",
  "audits-skipped": "The target-size, motion and live-region checks were skipped.",
  "keyboard-skipped": "The keyboard and focus-order check was skipped.",
  "contexts-skipped": "The mobile and dynamic-state check was skipped.",
  "stream-interrupted": "The audit was cut short before every check finished.",
};

type AxeCheck = { id: string; data?: unknown };
type AxeNode = {
  target: unknown;
  failureSummary?: string;
  any?: AxeCheck[];
  all?: AxeCheck[];
  none?: AxeCheck[];
};

function checkData(node: AxeNode, id: string): unknown {
  for (const list of [node.any, node.all, node.none]) {
    const found = list?.find((c) => c.id === id);
    if (found) return found.data;
  }
  return undefined;
}

function asStringArray(data: unknown): string[] {
  if (Array.isArray(data)) return data.filter((x) => typeof x === "string");
  if (typeof data === "string") return [data];
  return [];
}
type AxeRule = {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
  tags: string[];
  nodes: AxeNode[];
};
type AxeResults = {
  violations: AxeRule[];
  passes: AxeRule[];
  incomplete: AxeRule[];
};

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

async function primeLazyContent(page: Page): Promise<void> {
  await page
    .evaluate(async () => {
      await new Promise<void>((resolve) => {
        const step = Math.max(window.innerHeight * 0.9, 400);
        const maxSteps = 12;
        let scrolled = 0;
        let steps = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          scrolled += step;
          steps += 1;
          if (steps >= maxSteps || scrolled >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 120);
      });
    })
    .catch(() => {});
}

const ARIA_NAME_RULES = new Set([
  "button-name",
  "link-name",
  "input-button-name",
  "aria-command-name",
  "aria-input-field-name",
  "aria-toggle-field-name",
]);

const ELEMENT_RULES = new Set(["label", "image-alt", ...ARIA_NAME_RULES]);

function concreteFix(
  ruleId: string,
  node: AxeNode | undefined,
  elInfo?: ElementInfo,
): FixResult | null {
  if (!node) return null;
  if (ruleId === "html-has-lang" || ruleId === "html-lang-valid") return fixHtmlLang();
  if (ruleId === "document-title") return fixDocumentTitle();
  if (ruleId === "meta-viewport" || ruleId === "meta-viewport-large") return fixMetaViewport();
  if (ruleId === "label" && elInfo) return fixLabel(elInfo);
  if (ruleId === "image-alt" && elInfo) return fixImageAlt(elInfo);
  if (ARIA_NAME_RULES.has(ruleId) && elInfo) return fixAriaName(elInfo);
  if (ruleId === "aria-required-attr")
    return fixAriaRequiredAttr(asStringArray(checkData(node, "aria-required-attr")));
  if (ruleId === "aria-allowed-attr")
    return fixAriaAllowedAttr(asStringArray(checkData(node, "aria-allowed-attr")));
  if (ruleId === "color-contrast") {
    const check = node.any?.find((c) => c.id === "color-contrast");

    const d = check?.data as
      | {
          fgColor?: string;
          bgColor?: string;
          contrastRatio?: number;
          expectedContrastRatio?: string | number;
        }
      | undefined;
    if (
      d &&
      typeof d.fgColor === "string" &&
      typeof d.bgColor === "string" &&
      typeof d.contrastRatio === "number"
    ) {
      const expected =
        typeof d.expectedContrastRatio === "string"
          ? parseFloat(d.expectedContrastRatio)
          : (d.expectedContrastRatio ?? 4.5);
      return fixContrast({
        fgColor: d.fgColor,
        bgColor: d.bgColor,
        contrastRatio: d.contrastRatio,
        expectedContrastRatio: Number.isFinite(expected) ? expected : 4.5,
      });
    }
  }
  return null;
}

function firstTarget(target: unknown): string | null {
  if (Array.isArray(target) && typeof target[0] === "string") return target[0];
  if (typeof target === "string") return target;
  return null;
}

type VerifyOp = { ruleId: string; selector: string | null; apply: FixApply };

const VERIFY_IN_PAGE = async (ops: VerifyOp[]): Promise<FixVerification[]> => {
  // @ts-expect-error axe
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

export async function runScan(rawUrl: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_SCAN_BUDGET_MS;
  const budget = new Budget(
    budgetMs,
    Math.min(FINALIZE_RESERVE_MS, Math.round(budgetMs * FINALIZE_RESERVE_SHARE)),
  );
  const timings: Record<string, number> = {};

  const unavailable = () =>
    new ScanFailure(
      "The browser we use to open the page stopped responding before the audit could run.",
      "browser-unavailable",
    );

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
  const policy = new ScanPolicy(budget, WARNING_TEXT);

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
        throw new ScanFailure(
          "The browser we use to open the page took too long to start. Please try again.",
          "browser-unavailable",
        );
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
            `The page took longer than ${Math.round(navTimeout / 1000)}s to respond.`,
            "navigation-timeout",
          );
        }
        if (await sessionIsGone(page)) throw new BrowserGoneError(err);
        throw new ScanFailure("The page could not be reached.", "navigation-failed");
      }),
    );

    const httpStatus = response?.status() ?? 0;
    if (httpStatus >= 400) {
      throw new ScanFailure(
        `The page returned an error (HTTP ${httpStatus}). The address may be wrong or removed, or the page may need a login.`,
        "http-error",
      );
    }

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
      return page.evaluate(async () => {
        // @ts-expect-error axe
        return await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: [
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22a",
              "wcag22aa",
              "best-practice",
            ],
          },
        });
      });
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
      throw new ScanFailure(
        "The accessibility audit could not finish on this page in time.",
        "audit-failed",
      );
    }

    phase("processing");

    const wcagViolations = axe.violations.filter((v) => !v.tags.includes("best-practice"));
    const bpViolations = axe.violations.filter((v) => v.tags.includes("best-practice"));

    const elementSelectors = [
      ...new Set(
        wcagViolations
          .filter((v) => ELEMENT_RULES.has(v.id))
          .flatMap((v) => v.nodes.map((n) => firstTarget(n.target)))
          .filter((s): s is string => Boolean(s)),
      ),
    ];

    const elementInfos: Record<string, ElementInfo> =
      elementSelectors.length === 0
        ? {}
        : (
            await policy.run<Record<string, ElementInfo>>(
              "element-info",
              () =>
                page.evaluate((selectors) => {
                  const out: Record<string, ElementInfo> = {};
                  for (const sel of selectors) {
                    try {
                      const el = document.querySelector(sel);
                      if (!el) continue;
                      out[sel] = {
                        tag: el.tagName.toLowerCase(),
                        type: el.getAttribute("type") ?? undefined,
                        id: el.id || undefined,
                        name: el.getAttribute("name") ?? undefined,
                        placeholder: el.getAttribute("placeholder") ?? undefined,
                        ariaLabel: el.getAttribute("aria-label") ?? undefined,
                        src: el.getAttribute("src") ?? undefined,
                        role: el.getAttribute("role") ?? undefined,
                        text: (el.textContent ?? "").replace(/\s+/g, " ").trim() || undefined,
                        title: el.getAttribute("title") ?? undefined,
                        nearbyText:
                          (() => {
                            const fig = el.closest("figure");
                            const cap = fig?.querySelector("figcaption")?.textContent;
                            if (cap && cap.trim()) return cap.replace(/\s+/g, " ").trim();
                            const link = el.closest("a");
                            const lt = link?.textContent;
                            if (lt && lt.trim()) return lt.replace(/\s+/g, " ").trim();
                            return undefined;
                          })() ?? undefined,
                      };
                    } catch {
                      continue;
                    }
                  }
                  return out;
                }, elementSelectors),
              {},
            )
          ).value;

    type Enriched = { v: ScanViolation; clusters: FixCluster[] };
    const enriched: Enriched[] = wcagViolations.map((v) => {
      const severity = (v.impact ?? "minor") as Severity;
      const firstNode = v.nodes[0];
      const where = firstNode ? (firstTarget(firstNode.target) ?? "—") : "—";

      const perNode = v.nodes.map((n) => {
        const sel = firstTarget(n.target);
        const elInfo = sel && sel in elementInfos ? elementInfos[sel] : undefined;
        return { selector: sel, result: concreteFix(v.id, n, elInfo) };
      });
      const clusters = clusterFixes(perNode);

      const firstElInfo = where in elementInfos ? elementInfos[where] : undefined;
      const result = concreteFix(v.id, firstNode, firstElInfo);
      const fix =
        result?.text || firstNode?.failureSummary?.replace(/^Fix [^:]+:\s*/i, "").trim() || v.help;

      return {
        clusters,
        v: {
          id: v.id,
          severity,
          title: v.help,
          criterion: criterionFromTags(v.tags) ?? v.id,
          where,
          desc: v.description,
          fix,
          fixCode: result?.code,
          nodes: v.nodes.length,
        } satisfies ScanViolation,
      };
    });

    const applyFixGroups = () => {
      for (const e of enriched) {
        if (e.clusters.length > 0) {
          e.v.fixGroups = e.clusters.map(
            (c) =>
              ({
                text: c.text,
                code: c.code,
                count: c.count,
                selectors: c.selectors,
                verification: c.verification ?? "unchecked",
              }) satisfies FixGroup,
          );
          const main = e.clusters.find((c) => c.selectors.includes(e.v.where)) ?? e.clusters[0];
          e.v.verification = main.verification ?? "unchecked";
        }
      }
    };

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

    const targets: { selector: string; severity: Severity; label: string }[] = [];
    for (const v of wcagViolations) {
      const severity = (v.impact ?? "minor") as Severity;
      const sel = firstTarget(v.nodes[0]?.target);
      if (sel) targets.push({ selector: sel, severity, label: v.help });
    }

    const rects = (
      await policy.run<({ x: number; y: number; w: number; h: number } | null)[]>(
        "markers",
        () =>
          page.evaluate((items) => {
            return items.map((it) => {
              try {
                const el = document.querySelector(it.selector);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { x: r.left, y: r.top, w: r.width, h: r.height };
              } catch {
                return null;
              }
            });
          }, targets),
        targets.map(() => null),
      )
    ).value;

    const markers: ScanMarker[] = [];
    targets.forEach((t, i) => {
      const r = rects[i];
      if (!r || r.w === 0 || r.h === 0) return;
      if (r.y < 0 || r.y > VIEWPORT.height || r.x > VIEWPORT.width) return;
      if (r.w >= VIEWPORT.width * 0.9 && r.h >= VIEWPORT.height * 0.9) return;
      if (markers.length >= MAX_MARKERS) return;
      markers.push({
        n: markers.length + 1,
        severity: t.severity,
        label: t.label,
        left: (r.x / VIEWPORT.width) * 100,
        top: (r.y / VIEWPORT.height) * 100,
        width: (r.w / VIEWPORT.width) * 100,
        height: (r.h / VIEWPORT.height) * 100,
      });
    });

    const counts = {
      critical: violations.filter((v) => v.severity === "critical").length,
      serious: violations.filter((v) => v.severity === "serious").length,
      moderate: violations.filter((v) => v.severity === "moderate").length,
      minor: violations.filter((v) => v.severity === "minor").length,
      passed: axe.passes.length,
      bestPractice: bpViolations.length,
      manualReview: axe.incomplete.length,
    };

    const passed = axe.passes.map((p) => p.help);

    const MAX_SELECTORS = 5;

    const bestPractice = bpViolations.map((v) => ({
      id: v.id,
      title: v.help,
      desc: v.description,
      nodes: v.nodes.length,
      selectors: v.nodes
        .map((n) => firstTarget(n.target))
        .filter((s): s is string => Boolean(s))
        .slice(0, MAX_SELECTORS),
    }));

    const incomplete = axe.incomplete.map((v) => ({
      id: v.id,
      title: v.help,
      desc: v.description,
      nodes: v.nodes.length,
      criterion: criterionFromTags(v.tags) ?? v.id,
      selectors: v.nodes
        .map((n) => firstTarget(n.target))
        .filter((s): s is string => Boolean(s))
        .slice(0, MAX_SELECTORS),
    }));

    phase("finalizing");
    const core: ScanResult = {
      url,
      finalUrl,
      title,
      scannedElements: axe.passes.length + axe.violations.length + axe.incomplete.length,
      durationMs: Date.now() - startedAt,
      screenshot: null,
      score: computeScore(violations),
      counts,
      summary: buildSummary(counts),
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
              report.targetSize = await collectTargetSize(page);
              report.reducedMotion = await collectReducedMotion(page);
              report.liveRegions = await collectLiveRegions(page);
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
      },

      keyboard: async () => {
        const collected = await track("keyboard", () =>
          policy.run<KeyboardReport | undefined>(
            "keyboard",
            (allowanceMs) => collectKeyboard(page, VIEWPORT, { maxMs: allowanceMs * 0.75 }),
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

    return {
      ...core,
      durationMs: Date.now() - startedAt,
      screenshot,
      keyboard,
      contexts,
      audits,
      partial: policy.partial,
      warnings: policy.warnings().length > 0 ? policy.warnings() : undefined,
    };
  } finally {
    timings.total = Date.now() - startedAt;
    await context.close().catch(() => noop());
  }
}
