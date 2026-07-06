import path from "path";
import { getBrowserExecutor } from "./browser";
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
import { collectKeyboard } from "./keyboard";
import { collectContexts } from "./contexts";
import { buildFixFirst, buildSummary, computeScore, severityOrder } from "./derive";
import type {
  FixGroup,
  FixVerification,
  ScanMarker,
  ScanResult,
  ScanViolation,
  Severity,
} from "./types";

const VIEWPORT = { width: 1200, height: 800 };
const MAX_MARKERS = 6;
const MAX_VERIFY_OPS = 40;

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
    // axe entrega expectedContrastRatio como string ("4.5:1"); contrastRatio
    // como número.
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

// Operação de validação: aplica `apply` no DOM e re-roda o axe escopado na
// regra. `selector` null = mutação a nível de documento (lang, title, viewport).
type VerifyOp = { ruleId: string; selector: string | null; apply: FixApply };

// Aplica cada fix no DOM, re-roda o axe só naquela regra, reverte, e diz se a
// violação sumiu — é o que prova o conserto em vez de só afirmá-lo.
const VERIFY_IN_PAGE = async (ops: VerifyOp[]): Promise<FixVerification[]> => {
  // @ts-expect-error axe foi injetado no contexto da página
  const axe = window.axe;

  const runRule = async (context: Element | Document, ruleId: string): Promise<boolean> => {
    const res = await axe.run(context, {
      runOnly: { type: "rule", values: [ruleId] },
    });
    return res.violations.length === 0;
  };

  const results: FixVerification[] = [];
  // Sequencial de propósito: cada op reverte sua mutação antes da próxima, então
  // não há interferência cruzada entre consertos.
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
            // !important pra vencer a folha de estilo da página durante o teste
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

export async function runScan(rawUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const startedAt = Date.now();

  const browser = await getBrowserExecutor().launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      bypassCSP: true, // permite injetar o axe em páginas com CSP estrito
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessCheckBot/2.1",
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: 30_000,
    });

    // Um 404/500 ainda "carrega" uma página de erro, então sem checar o
    // status o scan analisaria essa página e geraria um relatório enganoso.
    const httpStatus = response?.status() ?? 0;
    if (httpStatus >= 400) {
      throw new Error(
        `The page responded with HTTP ${httpStatus}. Check the URL — it may be wrong, removed, or behind authentication.`,
      );
    }
    // Espera a rede assentar pra SPAs montarem o conteúdo. Sites "ao vivo"
    // (placares, ads) podem nunca ficar idle, então ignoramos o timeout.
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const title = (await page.title()) || url;
    const finalUrl = page.url();

    // JPEG (q80) em vez de PNG: ~5–10× menor. Mantém o histórico leve, já que o
    // screenshot é persistido como bytes quando o usuário está logado. Como
    // preview, a perda é imperceptível.
    const screenshotBuf = await page.screenshot({
      type: "jpeg",
      quality: 80,
      clip: { x: 0, y: 0, ...VIEWPORT },
    });
    const screenshot = `data:image/jpeg;base64,${screenshotBuf.toString("base64")}`;

    await page.addScriptTag({ path: AXE_PATH });
    const axe: AxeResults = await page.evaluate(async () => {
      // @ts-expect-error axe é injetado no contexto da página
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
                // seletor inválido — ignora
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

    const verifyOps: VerifyOp[] = [];
    const opClusters: FixCluster[] = [];
    for (const e of enriched) {
      for (const cluster of e.clusters) {
        if (verifyOps.length >= MAX_VERIFY_OPS) break;
        if (!cluster.apply) continue; // sem mutação auto-aplicável
        const docLevel = cluster.apply.kind === "doc" || cluster.apply.kind === "viewport";
        const selector = docLevel ? null : (cluster.selectors[0] ?? null);
        if (!docLevel && !selector) continue; // sem alvo pra aplicar
        verifyOps.push({ ruleId: e.v.id, selector, apply: cluster.apply });
        opClusters.push(cluster);
      }
    }

    const verifications =
      verifyOps.length > 0 ? await page.evaluate(VERIFY_IN_PAGE, verifyOps) : [];
    verifications.forEach((res, i) => {
      opClusters[i].verification = res;
    });

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

    const keyboard = await collectKeyboard(page, VIEWPORT).catch(() => undefined);

    const contexts = await collectContexts(
      page,
      violations.map((v) => v.id),
    ).catch(() => undefined);

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
      fixFirst: buildFixFirst(violations),
    };
  } finally {
    await browser.close();
  }
}
