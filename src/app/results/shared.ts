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

export function markerColor(sev: Severity): string {
  return {
    critical: "#e5484d",
    serious: "#b46107",
    moderate: "#d9a400",
    minor: "#9ca1ab",
  }[sev];
}

export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
