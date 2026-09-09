import type { ScanResult } from "./types";
import { SCAN_FRESH_MS } from "./cache-policy";
import { SCORING_VERSION, scoringVersionOf } from "./scored";
import { DEFAULT_REPORT_LOCALE, type ReportLocale } from "../i18n/locale";

const MAX_KEYS = 24;

type Entry = { result: ScanResult; storedAt: number };

const entries = new Map<string, Entry>();

function keyFor(url: string, locale: ReportLocale): string {
  const normalized = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return normalized ? `${locale}::${normalized}` : "";
}

function ageOf(entry: Entry): number {
  const at = entry.result.scannedAt ? Date.parse(entry.result.scannedAt) : NaN;
  return Date.now() - (Number.isNaN(at) ? entry.storedAt : at);
}

function store(key: string, entry: Entry): void {
  if (!key) return;
  entries.delete(key);
  entries.set(key, entry);
  while (entries.size > MAX_KEYS) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

export function rememberScan(result: ScanResult, typed?: string): void {
  if (result.partial) return;
  if (scoringVersionOf(result) !== SCORING_VERSION) return;
  const locale = result.locale ?? DEFAULT_REPORT_LOCALE;
  const entry: Entry = { result, storedAt: Date.now() };
  for (const spelling of [typed, result.url, result.finalUrl]) {
    if (spelling) store(keyFor(spelling, locale), entry);
  }
}

export function recallScan(url: string, locale: ReportLocale): ScanResult | null {
  const key = keyFor(url, locale);
  const entry = entries.get(key);
  if (!entry) return null;
  if (scoringVersionOf(entry.result) !== SCORING_VERSION) return null;
  if (ageOf(entry) > SCAN_FRESH_MS) {
    entries.delete(key);
    return null;
  }
  return entry.result;
}

export function clearScanCache(): void {
  entries.clear();
}
