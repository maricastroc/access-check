export type OutlineRule = { selector: string; declaration: string; href: string | null };

export type OutlineSource = { rule: OutlineRule | null; unreadable: number };

type Remover = {
  selectors: string[];
  declaration: string;
  important: boolean;
  href: string | null;
};

let removers: Remover[] | null = null;
let unreadable = 0;

export function forgetOutlineRules(): void {
  removers = null;
  unreadable = 0;
}

function removesOutline(style: CSSStyleDeclaration): boolean {
  const width = style.getPropertyValue("outline-width").trim();
  return (
    style.getPropertyValue("outline-style").trim() === "none" || width === "0" || width === "0px"
  );
}

function outlineDeclaration(style: CSSStyleDeclaration): { text: string; important: boolean } {
  const parts = style.cssText
    .split(";")
    .map((p) => p.trim())
    .filter((p) => /^outline(-style|-width)?\s*:/.test(p));
  return { text: parts.join("; "), important: parts.some((p) => /!important$/.test(p)) };
}

export function splitSelectorList(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function specificityOf(selector: string): [number, number, number] {
  let s = selector
    .replace(/"[^"]*"|'[^']*'/g, "")
    .replace(/:where\((?:[^()]|\([^()]*\))*\)/g, "")
    .replace(/:(?:is|not|has|matches)\(/g, " (");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const attrs = (s.match(/\[[^\]]*\]/g) ?? []).length;
  s = s.replace(/\[[^\]]*\]/g, "");
  const elements = (s.match(/::[\w-]+/g) ?? []).length;
  s = s.replace(/::[\w-]+/g, "");
  const classes = (s.match(/[.:][\w-]+/g) ?? []).length;
  s = s.replace(/[#.:][\w-]+(\([^)]*\))?/g, " ");
  const types = (s.match(/(?:^|[\s>+~(])[a-zA-Z][\w-]*/g) ?? []).length;
  return [ids, attrs + classes, types + elements];
}

function collect(rules: CSSRuleList, href: string | null, out: Remover[]): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSImportRule) {
      if (rule.styleSheet) readSheet(rule.styleSheet, out);
    } else if (rule instanceof CSSMediaRule) {
      if (window.matchMedia(rule.media.mediaText).matches) collect(rule.cssRules, href, out);
    } else if (rule instanceof CSSSupportsRule) {
      if (CSS.supports(rule.conditionText)) collect(rule.cssRules, href, out);
    } else if (rule instanceof CSSStyleRule) {
      if (!removesOutline(rule.style)) continue;
      const { text, important } = outlineDeclaration(rule.style);
      out.push({
        selectors: splitSelectorList(rule.selectorText),
        declaration: text,
        important,
        href,
      });
    } else if ("cssRules" in rule) {
      collect((rule as CSSGroupingRule).cssRules, href, out);
    }
  }
}

function readSheet(sheet: CSSStyleSheet, out: Remover[]): void {
  if (sheet.disabled) return;
  if (sheet.media.mediaText && !window.matchMedia(sheet.media.mediaText).matches) return;
  let rules: CSSRuleList;
  try {
    rules = sheet.cssRules;
  } catch {
    unreadable += 1;
    return;
  }
  collect(rules, sheet.href, out);
}

function removersOnPage(): Remover[] {
  if (removers) return removers;
  const out: Remover[] = [];
  for (const sheet of Array.from(document.styleSheets)) readSheet(sheet, out);
  removers = out;
  return out;
}

const outranks = (a: [number, number, number], b: [number, number, number]) =>
  a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];

export function outlineSourceOf(el: Element): OutlineSource {
  let best: {
    rule: OutlineRule;
    important: boolean;
    specificity: [number, number, number];
  } | null = null;
  for (const remover of removersOnPage()) {
    for (const selector of remover.selectors) {
      let hit = false;
      try {
        hit = el.matches(selector);
      } catch {
        continue;
      }
      if (!hit) continue;
      const specificity = specificityOf(selector);
      const wins =
        !best ||
        (remover.important && !best.important) ||
        (remover.important === best.important && outranks(specificity, best.specificity));
      if (wins)
        best = {
          rule: { selector, declaration: remover.declaration, href: remover.href },
          important: remover.important,
          specificity,
        };
    }
  }
  return { rule: best?.rule ?? null, unreadable };
}
