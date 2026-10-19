import type { FindingView } from "./findings";
import { parseContrastFix, type ContrastMeasurement } from "./contrast";
import { locatable, occurrencesOf } from "./occurrences";

export type PagePreview = { kind: "contrast" | "focus"; css: string; selectors: string[] };

const PROPERTY = { color: "color", background: "background-color" } as const;

function contrastPreview(f: FindingView): PagePreview | null {
  const groups: { reading: ContrastMeasurement | null; selectors: string[] }[] =
    f.fixGroups && f.fixGroups.length > 0
      ? f.fixGroups.map((g) => ({
          reading: parseContrastFix(g.text, g.code),
          selectors: g.selectors,
        }))
      : [{ reading: f.measurement, selectors: occurrencesOf(f).map((o) => o.selector) }];
  const rules: string[] = [];
  const selectors = new Set<string>();
  for (const { reading, selectors: own } of groups) {
    if (!reading?.toHex || !reading.prop) continue;
    for (const selector of own.filter(locatable)) {
      if (selectors.has(selector)) continue;
      selectors.add(selector);
      rules.push(`${selector} { ${PROPERTY[reading.prop]}: ${reading.toHex} !important; }`);
    }
  }
  return rules.length > 0
    ? { kind: "contrast", css: rules.join("\n"), selectors: [...selectors] }
    : null;
}

function focusPreview(f: FindingView): PagePreview | null {
  const groups = (f.fixGroups ?? []).filter((g) => g.code);
  const selectors = [...new Set(groups.flatMap((g) => g.selectors))];
  if (groups.length === 0 || selectors.length === 0) return null;
  return { kind: "focus", css: groups.map((g) => g.code).join("\n"), selectors };
}

export function pagePreviewOf(f: FindingView): PagePreview | null {
  if (f.kind === "wcag" && f.ruleId === "color-contrast") return contrastPreview(f);
  if (f.kind === "keyboard" && f.ruleId === "focus-not-visible") return focusPreview(f);
  return null;
}
