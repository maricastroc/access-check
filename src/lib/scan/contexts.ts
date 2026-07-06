import type { Page } from "playwright-core";
import type { Severity } from "./types";
import { criterionFromTags } from "./wcag";

export type ContextIssue = {
  id: string;
  title: string;
  criterion: string;
  severity: Severity;
  nodes: number;
  selectors: string[];
};

export type DynamicState = {
  label: string;
  selector: string;
  newIssues: ContextIssue[];
};

export type ContextReport = {
  mobile: {
    ran: boolean;
    width: number;
    onlyOnMobile: ContextIssue[];
  };
  dynamic: {
    ran: boolean;
    opened: number;
    states: DynamicState[];
  };
};

// Forma mínima de uma regra do axe que trafega entre o browser e o Node.
export type RawRule = {
  id: string;
  impact: string | null;
  help: string;
  tags: string[];
  nodeCount: number;
  selectors: string[];
};

const MAX_ISSUE_SELECTORS = 5;

export function toContextIssue(r: RawRule): ContextIssue {
  return {
    id: r.id,
    title: r.help,
    criterion: criterionFromTags(r.tags) ?? r.id,
    severity: (r.impact ?? "minor") as Severity,
    nodes: r.nodeCount,
    selectors: r.selectors.slice(0, MAX_ISSUE_SELECTORS),
  };
}

// Regras cujo id não está na baseline do desktop = novidade daquele contexto.
export function newIssues(baselineIds: Set<string>, rules: RawRule[]): ContextIssue[] {
  return rules.filter((r) => !baselineIds.has(r.id)).map(toContextIssue);
}

const MOBILE = { width: 375, height: 812 };
const MAX_TRIGGERS = 3;
const CONTEXT_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

type PageAxe = {
  run: (
    ctx: Element | Document,
    opts: unknown,
  ) => Promise<{
    violations: {
      id: string;
      impact?: string | null;
      help: string;
      tags: string[];
      nodes: { target: unknown }[];
    }[];
  }>;
};

export async function collectContexts(
  page: Page,
  baselineIdsArr: string[],
): Promise<ContextReport> {
  const baseline = new Set(baselineIdsArr);

  const dynamicStates: DynamicState[] = [];
  let opened = 0;
  let dynamicRan = false;

  try {
    const triggers = await page.evaluate((max) => {
      const cssPath = (el: Element | null): string => {
        if (!el || el.nodeType !== 1) return "";
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node.nodeType === 1 && parts.length < 5) {
          if (node.id) {
            parts.unshift(`#${CSS.escape(node.id)}`);
            break;
          }
          let s = node.tagName.toLowerCase();
          const p: Element | null = node.parentElement;
          if (p) {
            const same = Array.from(p.children).filter((c) => c.tagName === node!.tagName);
            if (same.length > 1) s += `:nth-of-type(${same.indexOf(node) + 1})`;
          }
          parts.unshift(s);
          node = p;
        }
        return parts.join(" > ");
      };
      const nameOf = (el: Element): string => {
        const a = el.getAttribute("aria-label");
        if (a && a.trim()) return a.trim().slice(0, 40);
        const t = el.textContent?.replace(/\s+/g, " ").trim();
        if (t) return t.slice(0, 40);
        const title = el.getAttribute("title");
        if (title && title.trim()) return title.trim().slice(0, 40);
        return "";
      };

      const out: {
        selector: string;
        label: string;
        kind: "details" | "aria";
        controls: string | null;
      }[] = [];
      const seen = new Set<string>();
      const add = (el: Element, kind: "details" | "aria", controls: string | null) => {
        if (out.length >= max) return;
        const sel = cssPath(el);
        if (!sel || seen.has(sel)) return;
        seen.add(sel);
        out.push({
          selector: sel,
          label: nameOf(el) || (kind === "details" ? "Disclosure" : "Menu"),
          kind,
          controls,
        });
      };

      for (const s of Array.from(document.querySelectorAll("details > summary")))
        add(s, "details", null);
      for (const b of Array.from(
        document.querySelectorAll('[aria-expanded="false"][aria-controls]'),
      )) {
        if (b.tagName === "A") continue;
        if (b.tagName !== "BUTTON" && b.getAttribute("role") !== "button") continue;
        if ((b as HTMLButtonElement).disabled) continue;
        if (b.getAttribute("aria-hidden") === "true") continue;
        add(b, "aria", b.getAttribute("aria-controls"));
      }
      return out;
    }, MAX_TRIGGERS);

    dynamicRan = true;

    for (const t of triggers) {
      const state = await page.evaluate(
        async ({ t, tags }) => {
          const firstTarget = (x: unknown): string | null =>
            Array.isArray(x) && typeof x[0] === "string" ? x[0] : typeof x === "string" ? x : null;

          const el = document.querySelector(t.selector) as HTMLElement | null;
          if (!el) return null;
          const hrefBefore = location.href;

          let opened = false;
          let scope: Element | null = null;
          let restore = () => {};

          if (t.kind === "details") {
            const d = el.closest("details") as HTMLDetailsElement | null;
            if (!d) return null;
            if (!d.open) {
              d.open = true;
              opened = true;
            }
            scope = d;
            restore = () => {
              if (opened) d.open = false;
            };
          } else {
            el.click();
            opened = el.getAttribute("aria-expanded") === "true";
            scope = t.controls ? document.getElementById(t.controls) : null;
            restore = () => {
              if (opened && el.getAttribute("aria-expanded") === "true") el.click();
            };
          }

          if (location.href !== hrefBefore) return { navigated: true as const };
          if (!opened || !scope) {
            restore();
            return { opened: false, rules: [] as RawRule[] };
          }

          await new Promise((r) => setTimeout(r, 150));

          let mapped: RawRule[] = [];
          try {
            const axe = (window as unknown as { axe: PageAxe }).axe;
            const res = await axe.run(scope, { runOnly: { type: "tag", values: tags } });
            mapped = res.violations.map((v) => ({
              id: v.id,
              impact: v.impact ?? null,
              help: v.help,
              tags: v.tags,
              nodeCount: v.nodes.length,
              selectors: v.nodes
                .map((n) => firstTarget(n.target))
                .filter((s): s is string => Boolean(s))
                .slice(0, 5),
            }));
          } catch {
            //
          }
          restore();
          return { opened: true, rules: mapped };
        },
        { t, tags: CONTEXT_TAGS },
      );

      if (!state) continue;
      if ("navigated" in state && state.navigated) break;
      if ("opened" in state && state.opened) {
        opened++;
        const issues = newIssues(baseline, state.rules);
        if (issues.length > 0) {
          dynamicStates.push({
            label: `Opened “${t.label}”`,
            selector: t.selector,
            newIssues: issues,
          });
        }
      }
    }
  } catch {
    //
  }

  let mobileRan = false;
  let onlyOnMobile: ContextIssue[] = [];
  try {
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(400);
    const rules = await page.evaluate(async (tags) => {
      const firstTarget = (x: unknown): string | null =>
        Array.isArray(x) && typeof x[0] === "string" ? x[0] : typeof x === "string" ? x : null;
      const axe = (window as unknown as { axe: PageAxe }).axe;
      const res = await axe.run(document, { runOnly: { type: "tag", values: tags } });
      return res.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        help: v.help,
        tags: v.tags,
        nodeCount: v.nodes.length,
        selectors: v.nodes
          .map((n) => firstTarget(n.target))
          .filter((s): s is string => Boolean(s))
          .slice(0, 5),
      }));
    }, CONTEXT_TAGS);
    mobileRan = true;
    onlyOnMobile = newIssues(baseline, rules);
  } catch {
    //
  }

  return {
    mobile: { ran: mobileRan, width: MOBILE.width, onlyOnMobile },
    dynamic: { ran: dynamicRan, opened, states: dynamicStates },
  };
}
