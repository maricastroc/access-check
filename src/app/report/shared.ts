import type { Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";

export const DEFAULT_URL = "example.com";

/** Régua severity roles (fixed). minor reads as muted; no dedicated hue. */
export const sevHex: Record<Severity, string> = {
  critical: "#b3261e",
  serious: "#a85a06",
  moderate: "#8a6a00",
  minor: "#6b6c70",
};
export const sevTint: Record<Severity, string> = {
  critical: "#f6e2e1",
  serious: "#f3e7d5",
  moderate: "#f0ecd3",
  minor: "#ecebe4",
};
export const sevLabel: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function shortId(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}
