import path from "path";
import type { Page } from "playwright-core";
import { acquireBrowser } from "./browser";
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
import { collectTargetSize, type TargetSizeReport } from "./target-size";
import { collectReducedMotion, type ReducedMotionReport } from "./reduced-motion";
import { collectLiveRegions, type LiveRegionsReport } from "./live-regions";
import type { AuditsReport } from "./audits";
import { buildFixFirst, buildSummary, computeScore, severityOrder } from "./derive";
import { withBudget } from "./budget";
import { installNetworkGuard } from "./ssrf";
import type {
  FixGroup,
  FixVerification,
  ScanMarker,
  ScanPhase,
  ScanResult,
  ScanViolation,
  Severity,
} from "./types";

const VIEWPORT = { width: 1200, height: 800 };
const MAX_MARKERS = 6;
const MAX_VERIFY_OPS = 40;

const SCAN_DEADLINE_MS = 50_000;

/** Bounded settle after priming lazy content — replaces the old networkidle wait. */
const SETTLE_MS = 700;

const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

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

/**
 * Scrolls the page top-to-bottom in steps, then back to the top, so lazy
 * content (native loading="lazy" images, IntersectionObserver-driven widgets)
 * actually loads before we screenshot and audit it. Bounded so a very tall page
 * can't stall the scan; short pages exit after a step or two.
 */
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
  /** Our own detection engine: target size, reduced motion, live regions. */
  audits?: boolean;
  verifyFixes?: boolean;
  /**
   * Aborts browser requests to private/reserved addresses, including those that
   * arrive via redirect. Enabled on the public path (API routes); left off by
   * default so that tests/internal use can target 127.0.0.1.
   */
  blockPrivateHosts?: boolean;
  /** Called at each real milestone so the caller can stream progress. */
  onPhase?: (phase: ScanPhase) => void;
};

export async function runScan(rawUrl: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const {
    screenshot: doScreenshot = true,
    keyboard: doKeyboard = true,
    contexts: doContexts = true,
    audits: doAudits = true,
    verifyFixes: doVerify = true,
    blockPrivateHosts = false,
    onPhase,
  } = opts;
  const url = normalizeUrl(rawUrl);
  const startedAt = Date.now();
  let partial = false;
  const remainingMs = () => SCAN_DEADLINE_MS - (Date.now() - startedAt);
  const phase = (p: ScanPhase) => {
    try {
      onPhase?.(p);
    } catch {
      // A misbehaving progress listener must never break a scan.
    }
  };

  phase("preparing");
  const browser = await acquireBrowser();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    bypassCSP: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessCheckBot/2.1",
  });
  try {
    if (blockPrivateHosts) await installNetworkGuard(context);
    const page = await context.newPage();

    phase("loading");
    // `networkidle` is deliberately NOT used: ad-heavy pages and SPAs keep
    // connections alive (analytics beacons, WebSockets), so it almost always
    // burns its full timeout. "load" fires once the document's own resources are
    // in (it doesn't wait for those persistent connections) and, unlike
    // domcontentloaded, lets client-side redirects settle before we inject axe.
    // We then scroll to force lazy content, then a short bounded settle.
    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: 30_000,
    });

    const httpStatus = response?.status() ?? 0;
    if (httpStatus >= 400) {
      throw new Error(
        `The page responded with HTTP ${httpStatus}. Check the URL — it may be wrong, removed, or behind authentication.`,
      );
    }

    await primeLazyContent(page);
    await page.waitForTimeout(SETTLE_MS);

    const title = (await page.title()) || url;
    const finalUrl = page.url();

    phase("auditing");
    // Screenshot and axe touch the page independently, so capture them together
    // instead of serializing a ~50ms screenshot in front of the audit. A late
    // client-side redirect can destroy the execution context mid-capture; if
    // that happens we wait for the new document and retry once.
    const capture = async (): Promise<[string | null, AxeResults]> => {
      const shot: Promise<string | null> = doScreenshot
        ? page
            .screenshot({ type: "jpeg", quality: 80, clip: { x: 0, y: 0, ...VIEWPORT } })
            .then((buf) => `data:image/jpeg;base64,${buf.toString("base64")}`)
        : Promise.resolve(null);

      const run: Promise<AxeResults> = page.addScriptTag({ path: AXE_PATH }).then(() =>
        page.evaluate(async () => {
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
        }),
      );

      return Promise.all([shot, run]);
    };

    let screenshot: string | null;
    let axe: AxeResults;
    try {
      [screenshot, axe] = await capture();
    } catch (err) {
      if (/Execution context was destroyed|because of a navigation/i.test(String(err))) {
        await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
        [screenshot, axe] = await capture();
      } else {
        throw err;
      }
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
        : await page.evaluate((selectors) => {
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
                //
              }
            }
            return out;
          }, elementSelectors);

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

    if (doVerify) {
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

      if (verifyOps.length > 0) {
        const { value: verifications, timedOut } = await withBudget(
          () => page.evaluate(VERIFY_IN_PAGE, verifyOps),
          remainingMs(),
          [] as FixVerification[],
        );
        if (timedOut) partial = true;
        else
          verifications.forEach((res, i) => {
            opClusters[i].verification = res;
          });
      }
    }

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

    const violations: ScanViolation[] = enriched
      .map((e) => e.v)
      .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

    const targets: { selector: string; severity: Severity; label: string }[] = [];
    for (const v of wcagViolations) {
      const severity = (v.impact ?? "minor") as Severity;
      const sel = firstTarget(v.nodes[0]?.target);
      if (sel) targets.push({ selector: sel, severity, label: v.help });
    }

    const rects = await page.evaluate((items) => {
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
    }, targets);

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

    let audits: AuditsReport | undefined;
    if (doAudits) {
      audits = {};

      const targetSize = await withBudget<TargetSizeReport | undefined>(
        () => collectTargetSize(page),
        remainingMs(),
        undefined,
      );
      if (targetSize.timedOut) partial = true;
      else audits.targetSize = targetSize.value;

      const reducedMotion = await withBudget<ReducedMotionReport | undefined>(
        () => collectReducedMotion(page),
        remainingMs(),
        undefined,
      );
      if (reducedMotion.timedOut) partial = true;
      else audits.reducedMotion = reducedMotion.value;

      const liveRegions = await withBudget<LiveRegionsReport | undefined>(
        () => collectLiveRegions(page),
        remainingMs(),
        undefined,
      );
      if (liveRegions.timedOut) partial = true;
      else audits.liveRegions = liveRegions.value;
    }

    let keyboard: KeyboardReport | undefined;
    if (doKeyboard) {
      const { value, timedOut } = await withBudget<KeyboardReport | undefined>(
        () => collectKeyboard(page, VIEWPORT),
        remainingMs(),
        undefined,
      );
      keyboard = value;
      if (timedOut) partial = true;
    }

    let contexts: ContextReport | undefined;
    if (doContexts) {
      const { value, timedOut } = await withBudget<ContextReport | undefined>(
        () => collectContexts(page, violations.map((v) => v.id)),
        remainingMs(),
        undefined,
      );
      contexts = value;
      if (timedOut) partial = true;
    }

    phase("finalizing");

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

    return {
      url,
      finalUrl,
      title,
      scannedElements: axe.passes.length + axe.violations.length + axe.incomplete.length,
      durationMs: Date.now() - startedAt,
      screenshot,
      score: computeScore(violations),
      counts,
      summary: buildSummary(counts),
      violations,
      incomplete,
      bestPractice,
      passed,
      markers,
      keyboard,
      contexts,
      audits,
      fixFirst: buildFixFirst(violations),
      partial,
    };
  } finally {
    // Close only the context — the browser is shared and reused across scans.
    await context.close().catch(() => {});
  }
}
