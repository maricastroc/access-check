import {
  isReportLocale,
  normalizeReportLocale,
  type ReportLocale,
} from "../../src/lib/i18n/locale";

export const LOCALE_KEY = "locale";

export const RETRANSLATE_KEY = "localeJustChanged";

export const FOLLOW_BROWSER = "auto";

export type LocalePreference = ReportLocale | typeof FOLLOW_BROWSER;

export function browserLocale(): ReportLocale {
  return normalizeReportLocale(chrome.i18n.getUILanguage());
}

export function asPreference(stored: unknown): LocalePreference {
  return stored === FOLLOW_BROWSER || isReportLocale(stored) ? stored : FOLLOW_BROWSER;
}

export function localeOf(preference: LocalePreference): ReportLocale {
  return preference === FOLLOW_BROWSER ? browserLocale() : preference;
}

export async function readPreference(): Promise<LocalePreference> {
  const stored = await chrome.storage.local.get(LOCALE_KEY).catch(() => ({}));
  return asPreference((stored as Record<string, unknown>)[LOCALE_KEY]);
}

export async function writePreference(preference: LocalePreference): Promise<void> {
  await chrome.storage.local.set({ [LOCALE_KEY]: preference }).catch(() => {});
}

export async function readLocale(): Promise<ReportLocale> {
  return localeOf(await readPreference());
}

export async function markLanguageChanged(): Promise<void> {
  await chrome.storage.session.set({ [RETRANSLATE_KEY]: true }).catch(() => {});
}

export async function takeLanguageChanged(): Promise<boolean> {
  const stored = await chrome.storage.session.get(RETRANSLATE_KEY).catch(() => ({}));
  const flagged = (stored as Record<string, unknown>)[RETRANSLATE_KEY] === true;
  if (flagged) await chrome.storage.session.remove(RETRANSLATE_KEY).catch(() => {});
  return flagged;
}
