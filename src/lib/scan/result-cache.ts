import type { ScanResult } from "./types";
import { SCAN_FRESH_MS } from "./cache-policy";

const MAX_KEYS = 24;

type Entry = { result: ScanResult; storedAt: number };

const entries = new Map<string, Entry>();

function keyFor(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
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
  const entry: Entry = { result, storedAt: Date.now() };
  for (const spelling of [typed, result.url, result.finalUrl]) {
    if (spelling) store(keyFor(spelling), entry);
  }
}

export function recallScan(url: string): ScanResult | null {
  const entry = entries.get(keyFor(url));
  if (!entry) return null;
  if (ageOf(entry) > SCAN_FRESH_MS) {
    entries.delete(keyFor(url));
    return null;
  }
  return entry.result;
}

export function clearScanCache(): void {
  entries.clear();
}
