import type { Locale } from "axe-core";
import ptBR from "axe-core/locales/pt_BR.json";
import { axeLocaleFile, type ReportLocale } from "./locale";

const BUNDLED: Record<string, Locale> = {
  pt_BR: ptBR as unknown as Locale,
};

export function axeLocaleFor(locale: ReportLocale): Locale | null {
  const file = axeLocaleFile(locale);
  if (!file) return null;
  return BUNDLED[file] ?? null;
}
