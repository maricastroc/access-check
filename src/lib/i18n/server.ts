import { cookies, headers } from "next/headers";
import {
  DEFAULT_REPORT_LOCALE,
  isReportLocale,
  localeFromAcceptLanguage,
  type ReportLocale,
} from "./locale";
import { translator, type Translate } from "./t";

export const LOCALE_COOKIE = "accesscheck_locale";

export async function resolveLocale(): Promise<ReportLocale> {
  try {
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isReportLocale(chosen)) return chosen;

    return localeFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_REPORT_LOCALE;
  }
}

export async function getTranslate(): Promise<Translate> {
  return translator(await resolveLocale());
}

export function localeFromRequest(req: Request): ReportLocale {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  if (match && isReportLocale(match[1])) return match[1];

  return localeFromAcceptLanguage(req.headers.get("accept-language"));
}

export function translateForRequest(req: Request): Translate {
  return translator(localeFromRequest(req));
}
