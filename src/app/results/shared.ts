import type { ScanResult, Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";
export type FilterKey = "all" | Severity | "passed";

export const DEFAULT_URL = "example.com";

export type VerifyStats = {
  verified: number;
  checked: number;
};

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
