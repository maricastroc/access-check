import type { ScanResult } from "./types";

export const SCAN_FRESH_MS = 5 * 60 * 1000;

export const SCAN_FRESH_SECONDS = SCAN_FRESH_MS / 1000;

export const MAX_CACHED_SCREENSHOT_CHARS = 1_000_000;

export function trimForCache(result: ScanResult): ScanResult {
  const shot = result.screenshot;
  if (!shot || shot.length <= MAX_CACHED_SCREENSHOT_CHARS) return result;
  return { ...result, screenshot: null };
}
