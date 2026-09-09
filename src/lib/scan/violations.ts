import { criterionFromTags } from "./wcag";
import type { Translate } from "../i18n/t";
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
import { clusterFixes, type FixCluster } from "./group";
import type { FixGroup, ScanBestPractice, ScanIncomplete, ScanViolation, Severity } from "./types";

export type AxeCheck = { id: string; data?: unknown };
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

export type AxeRule = {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
  tags: string[];
  nodes: AxeNode[];
};
export type AxeResults = {
  violations: AxeRule[];
  passes: AxeRule[];
  incomplete: AxeRule[];
};

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
  t: Translate,
  elInfo?: ElementInfo,
): FixResult | null {
  if (!node) return null;
  if (ruleId === "html-has-lang" || ruleId === "html-lang-valid") return fixHtmlLang(t);
  if (ruleId === "document-title") return fixDocumentTitle(t);
  if (ruleId === "meta-viewport" || ruleId === "meta-viewport-large") return fixMetaViewport(t);
  if (ruleId === "label" && elInfo) return fixLabel(elInfo, t);
  if (ruleId === "image-alt" && elInfo) return fixImageAlt(elInfo, t);
  if (ARIA_NAME_RULES.has(ruleId) && elInfo) return fixAriaName(elInfo, t);
  if (ruleId === "aria-required-attr")
    return fixAriaRequiredAttr(asStringArray(checkData(node, "aria-required-attr")), t);
  if (ruleId === "aria-allowed-attr")
    return fixAriaAllowedAttr(asStringArray(checkData(node, "aria-allowed-attr")), t);
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
      return fixContrast(
        {
          fgColor: d.fgColor,
          bgColor: d.bgColor,
          contrastRatio: d.contrastRatio,
          expectedContrastRatio: Number.isFinite(expected) ? expected : 4.5,
        },
        t,
      );
    }
  }
  return null;
}

export function firstTarget(target: unknown): string | null {
  if (Array.isArray(target) && typeof target[0] === "string") return target[0];
  if (typeof target === "string") return target;
  return null;
}

export type Enriched = { v: ScanViolation; clusters: FixCluster[] };

export function elementSelectorsFor(violations: AxeRule[]): string[] {
  return [
    ...new Set(
      violations
        .filter((v) => ELEMENT_RULES.has(v.id))
        .flatMap((v) => v.nodes.map((n) => firstTarget(n.target)))
        .filter((s): s is string => Boolean(s)),
    ),
  ];
}

export function stripFailurePrefix(summary: string): string {
  const [first, ...rest] = summary.split("\n");
  if (rest.length > 0 && first.trimEnd().endsWith(":")) return rest.join("\n").trim();
  return summary.trim();
}

export function enrichViolations(
  violations: AxeRule[],
  elementInfos: Record<string, ElementInfo>,
  t: Translate,
): Enriched[] {
  return violations.map((v) => {
    const severity = (v.impact ?? "minor") as Severity;
    const firstNode = v.nodes[0];
    const where = firstNode ? (firstTarget(firstNode.target) ?? "\u2014") : "\u2014";

    const perNode = v.nodes.map((n) => {
      const sel = firstTarget(n.target);
      const elInfo = sel && sel in elementInfos ? elementInfos[sel] : undefined;
      return { selector: sel, result: concreteFix(v.id, n, t, elInfo) };
    });
    const clusters = clusterFixes(perNode);

    const firstElInfo = where in elementInfos ? elementInfos[where] : undefined;
    const result = concreteFix(v.id, firstNode, t, firstElInfo);
    const summary = firstNode?.failureSummary;
    const fix = result?.text || (summary ? stripFailurePrefix(summary) : "") || v.help;

    return {
      clusters,
      v: {
        id: v.id,
        severity,
        title: v.help,
        criterion: criterionFromTags(v.tags, t) ?? v.id,
        where,
        desc: v.description,
        fix,
        fixCode: result?.code,
        nodes: v.nodes.length,
      } satisfies ScanViolation,
    };
  });
}

const MAX_SELECTORS = 5;

function selectorsOf(nodes: AxeNode[]): string[] {
  return nodes
    .map((n) => firstTarget(n.target))
    .filter((s): s is string => Boolean(s))
    .slice(0, MAX_SELECTORS);
}

export function buildBestPractice(rules: AxeRule[]): ScanBestPractice[] {
  return rules.map((v) => ({
    id: v.id,
    title: v.help,
    desc: v.description,
    nodes: v.nodes.length,
    selectors: selectorsOf(v.nodes),
  }));
}

export function buildIncomplete(rules: AxeRule[], t: Translate): ScanIncomplete[] {
  return rules.map((v) => ({
    id: v.id,
    title: v.help,
    desc: v.description,
    nodes: v.nodes.length,
    criterion: criterionFromTags(v.tags, t) ?? v.id,
    selectors: selectorsOf(v.nodes),
  }));
}

export function attachFixGroups(enriched: Enriched[]): void {
  for (const e of enriched) {
    if (e.clusters.length === 0) continue;
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
