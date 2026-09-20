import type { ScanResult } from "./types";

export const SCAN_FRESH_MS = 5 * 60 * 1000;

export const SCAN_FRESH_SECONDS = SCAN_FRESH_MS / 1000;

export const MAX_CACHED_SCREENSHOT_CHARS = 1_000_000;

function weight(result: ScanResult): number {
  const shot = result.screenshot?.length ?? 0;
  const regions = (result.regions ?? []).reduce((n, r) => n + (r.image?.length ?? 0), 0);
  return shot + regions;
}

export function trimForCache(result: ScanResult): ScanResult {
  if (weight(result) <= MAX_CACHED_SCREENSHOT_CHARS) return result;

  const lighter: ScanResult = {
    ...result,
    regions: (result.regions ?? []).map((region) =>
      region.image ? { ...region, image: null, missed: "bytes" as const } : region,
    ),
  };
  if (lighter.regions?.length === 0) delete lighter.regions;

  if (weight(lighter) <= MAX_CACHED_SCREENSHOT_CHARS) return lighter;
  return { ...lighter, screenshot: null };
}
