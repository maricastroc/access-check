import type { Locale } from "axe-core";
import ptBR from "axe-core/locales/pt_BR.json";
import { axePtBRGaps } from "./axe-pt-BR";
import { axeLocaleFile, type ReportLocale } from "./locale";

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function filled(base: Tree, gaps: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(gaps)) {
    const current = out[key];
    if (isTree(current) && isTree(value)) out[key] = filled(current, value);
    else if (current === undefined) out[key] = value;
  }
  return out;
}

const BUNDLED: Record<string, Locale> = {
  pt_BR: filled(ptBR, axePtBRGaps) as unknown as Locale,
};

export function axeLocaleFor(locale: ReportLocale): Locale | null {
  const file = axeLocaleFile(locale);
  if (!file) return null;
  return BUNDLED[file] ?? null;
}
