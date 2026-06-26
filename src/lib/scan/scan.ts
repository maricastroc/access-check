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
  type FixResult,
} from "./remediate";
import {
  buildFixFirst,
  buildSummary,
  computeScore,
  severityOrder,
} from "./derive";
import type { ScanMarker, ScanResult, ScanViolation, Severity } from "./types";

const VIEWPORT = { width: 1200, height: 800 };
const MAX_MARKERS = 6;

// Caminho do axe-core no runtime (process.cwd() = raiz do projeto).
const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

// Tipos mínimos do retorno do axe.run (só o que usamos).
type AxeCheck = { id: string; data?: unknown };
type AxeNode = {
  target: unknown;
  failureSummary?: string;
  any?: AxeCheck[];
  all?: AxeCheck[];
  none?: AxeCheck[];
};

/** Acha o `data` de um check por id, procurando em any/all/none do nó. */
function checkData(node: AxeNode, id: string): unknown {
  for (const list of [node.any, node.all, node.none]) {
    const found = list?.find((c) => c.id === id);
    if (found) return found.data;
  }
  return undefined;
}

/** Coage um valor desconhecido do axe pra array de strings. */
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
 * Tenta gerar um fix concreto e determinístico pra um nó. Hoje só contraste;
 * cai pra null quando não há gerador, e o chamador usa o texto do axe.
 */
// Regras de "nome acessível ausente" — todas resolvidas com aria-label/texto.
const ARIA_NAME_RULES = new Set([
  "button-name",
  "link-name",
  "input-button-name",
  "aria-command-name",
  "aria-input-field-name",
  "aria-toggle-field-name",
]);

// Regras cujo fix depende dos atributos do elemento (coletados na página).
const ELEMENT_RULES = new Set([
  "label",
  "image-alt",
  ...ARIA_NAME_RULES,
]);

function concreteFix(
  ruleId: string,
  node: AxeNode | undefined,
  elInfo?: ElementInfo,
): FixResult | null {
  if (!node) return null;
  // Regras com fix mecânico fixo (não dependem do DOM).
  if (ruleId === "html-has-lang" || ruleId === "html-lang-valid")
    return fixHtmlLang();
  if (ruleId === "document-title") return fixDocumentTitle();
  if (ruleId === "meta-viewport" || ruleId === "meta-viewport-large")
    return fixMetaViewport();
  // Regras que leem atributos do elemento.
  if (ruleId === "label" && elInfo) return fixLabel(elInfo);
  if (ruleId === "image-alt" && elInfo) return fixImageAlt(elInfo);
  if (ARIA_NAME_RULES.has(ruleId) && elInfo) return fixAriaName(elInfo);
  // Regras ARIA onde o axe lista os atributos exatos no check.
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

/** Pega o primeiro seletor CSS do nó (axe devolve target como array). */
function firstTarget(target: unknown): string | null {
  if (Array.isArray(target) && typeof target[0] === "string") return target[0];
  if (typeof target === "string") return target;
  return null;
}

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
    await page
      .waitForLoadState("networkidle", { timeout: 6_000 })
      .catch(() => {});
    await page.waitForTimeout(1500);

    const title = (await page.title()) || url;
    const finalUrl = page.url();

    const screenshotBuf = await page.screenshot({
      clip: { x: 0, y: 0, ...VIEWPORT },
    });
    const screenshot = `data:image/png;base64,${screenshotBuf.toString("base64")}`;

    await page.addScriptTag({ path: AXE_PATH });
    const axe: AxeResults = await page.evaluate(async () => {
      // @ts-expect-error axe é injetado no contexto da página
      return await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      });
    });

    // Coleta atributos dos elementos cujo fix depende do DOM (ex.: inputs sem
    // rótulo), indexados pelo seletor do primeiro nó da violação.
    const elementSelectors = axe.violations
      .filter((v) => ELEMENT_RULES.has(v.id))
      .map((v) => firstTarget(v.nodes[0]?.target))
      .filter((s): s is string => Boolean(s));

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
                  text:
                    (el.textContent ?? "").replace(/\s+/g, " ").trim() ||
                    undefined,
                  title: el.getAttribute("title") ?? undefined,
                  // Contexto pra alt: legenda da figura ou texto do link/figura
                  // que envolve a imagem (sem o próprio textContent da img).
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

    // ---- mapear violações ----
    const violations: ScanViolation[] = axe.violations
      .map((v) => {
        const severity = (v.impact ?? "minor") as Severity;
        const firstNode = v.nodes[0];
        const where = firstNode ? (firstTarget(firstNode.target) ?? "—") : "—";
        const elInfo = where in elementInfos ? elementInfos[where] : undefined;
        // Prefere um fix concreto e determinístico; senão, cai no texto do axe.
        const result = concreteFix(v.id, firstNode, elInfo);
        const fix =
          result?.text ||
          firstNode?.failureSummary?.replace(/^Fix [^:]+:\s*/i, "").trim() ||
          v.help;
        return {
          id: v.id,
          severity,
          title: v.help,
          criterion: criterionFromTags(v.tags) ?? v.id,
          where,
          desc: v.description,
          fix,
          fixCode: result?.code,
          nodes: v.nodes.length,
        } satisfies ScanViolation;
      })
      .sort(
        (a, b) =>
          severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
      );

    // ---- marcadores: bounding box dos nós acima da dobra ----
    const targets: { selector: string; severity: Severity; label: string }[] =
      [];
    for (const v of axe.violations) {
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
      // só conta o que está visível na área capturada
      if (r.y < 0 || r.y > VIEWPORT.height || r.x > VIEWPORT.width) return;
      // pula violações a nível de documento (ex. <title> ausente, mapeadas
      // ao <html>): a caixa cobre a viewport toda e viraria um overlay
      // gigante tingindo o preview inteiro. A violação segue no relatório.
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

    // ---- contagens / score / derivados ----
    const counts = {
      critical: violations.filter((v) => v.severity === "critical").length,
      serious: violations.filter((v) => v.severity === "serious").length,
      moderate: violations.filter((v) => v.severity === "moderate").length,
      minor: violations.filter((v) => v.severity === "minor").length,
      passed: axe.passes.length,
    };

    const passed = axe.passes.map((p) => p.help);

    return {
      url,
      finalUrl,
      title,
      scannedElements:
        axe.passes.length + axe.violations.length + axe.incomplete.length,
      durationMs: Date.now() - startedAt,
      screenshot,
      score: computeScore(violations),
      counts,
      summary: buildSummary(counts),
      violations,
      passed,
      markers,
      fixFirst: buildFixFirst(violations),
    };
  } finally {
    await browser.close();
  }
}
