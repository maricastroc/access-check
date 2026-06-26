import path from "path";
import { getBrowserExecutor } from "./browser";
import { criterionFromTags } from "./wcag";
import { buildFixFirst, buildSummary, computeScore, severityOrder } from "./derive";
import type {
  ScanMarker,
  ScanResult,
  ScanViolation,
  Severity,
} from "./types";

const VIEWPORT = { width: 1200, height: 800 };
const MAX_MARKERS = 6;

// Caminho do axe-core no runtime (process.cwd() = raiz do projeto).
const AXE_PATH = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

// Tipos mínimos do retorno do axe.run (só o que usamos).
type AxeNode = { target: unknown; failureSummary?: string };
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

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // dá um respiro pra hidratar SPAs simples
    await page.waitForTimeout(800);

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

    // ---- mapear violações ----
    const violations: ScanViolation[] = axe.violations
      .map((v) => {
        const severity = (v.impact ?? "minor") as Severity;
        const firstNode = v.nodes[0];
        const where = firstNode ? firstTarget(firstNode.target) ?? "—" : "—";
        const fix =
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
