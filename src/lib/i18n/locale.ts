export const REPORT_LOCALES = ["en", "pt-BR"] as const;

export type ReportLocale = (typeof REPORT_LOCALES)[number];

export const DEFAULT_REPORT_LOCALE: ReportLocale = "en";

const AXE_LOCALE_FILE: Record<ReportLocale, string | null> = {
  en: null,
  "pt-BR": "pt_BR",
};

export function isReportLocale(value: unknown): value is ReportLocale {
  return typeof value === "string" && (REPORT_LOCALES as readonly string[]).includes(value);
}

export function normalizeReportLocale(input: string | null | undefined): ReportLocale {
  if (!input) return DEFAULT_REPORT_LOCALE;
  const tag = input.trim().toLowerCase().replace(/_/g, "-");
  if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
  return DEFAULT_REPORT_LOCALE;
}

export function localeFromAcceptLanguage(header: string | null | undefined): ReportLocale {
  if (!header) return DEFAULT_REPORT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params.find((p) => p.trim().startsWith("q="));
      const q = quality ? Number.parseFloat(quality.split("=")[1]) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0 && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag === "*") continue;
    const matched = normalizeReportLocale(tag);
    if (matched !== DEFAULT_REPORT_LOCALE) return matched;
    if (tag.toLowerCase().startsWith("en")) return DEFAULT_REPORT_LOCALE;
  }

  return DEFAULT_REPORT_LOCALE;
}

export function axeLocaleFile(locale: ReportLocale): string | null {
  return AXE_LOCALE_FILE[locale];
}

export function htmlLang(locale: ReportLocale): string {
  return locale;
}

export function langAttrs(
  content: ReportLocale | undefined,
  ui: ReportLocale = DEFAULT_REPORT_LOCALE,
): { lang?: string } {
  const resolved = content ?? DEFAULT_REPORT_LOCALE;
  return resolved === ui ? {} : { lang: htmlLang(resolved) };
}
