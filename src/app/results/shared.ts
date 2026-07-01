import type { Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";
export type FilterKey = "all" | Severity | "passed";

export const DEFAULT_URL = "example.com";

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
