import type { ScanResult, Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";
export type FilterKey = "all" | Severity | "passed";

export const DEFAULT_URL = "example.com";

export type VerifyStats = {
  /** fixes whose re-scan passed — proven to clear the violation */
  verified: number;
  /** fixes that could be auto-applied and re-audited (verified + failed) */
  checked: number;
};

/**
 * Aggregate the per-fix verification outcomes across every violation, so the UI
 * can surface the flagship "we prove the fix" behaviour as a single headline
 * number instead of hiding it inside each expanded card.
 */
export function verifyStats(result: ScanResult): VerifyStats {
  let verified = 0;
  let checked = 0;
  for (const v of result.violations) {
    const outcomes =
      v.fixGroups && v.fixGroups.length > 0
        ? v.fixGroups.map((g) => g.verification)
        : [v.verification];
    for (const outcome of outcomes) {
      if (outcome === "verified") {
        verified++;
        checked++;
      } else if (outcome === "failed") {
        checked++;
      }
    }
  }
  return { verified, checked };
}

export function fixDomId(title: string): string {
  return `fix-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Hex values are intentional — used with inline alpha suffix (e.g. `${markerColor}1f`)
export function markerColor(sev: Severity): string {
  return {
    critical: "#c62a2f",
    serious: "#a85a06",
    moderate: "#8a6a00",
    minor: "#6b7079",
  }[sev];
}

export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
