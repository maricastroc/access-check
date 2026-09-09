"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "./locale";
import { translator, type Translate } from "./t";

const LocaleContext = createContext<ReportLocale>(DEFAULT_REPORT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: ReportLocale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): ReportLocale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
