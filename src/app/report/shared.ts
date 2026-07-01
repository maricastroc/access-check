import type { Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";

export const DEFAULT_URL = "example.com";

export const sevHex: Record<Severity, string> = {
  critical: "#c62a2f",
  serious: "#a85a06",
  moderate: "#8a6a00",
  minor: "#6b7079",
};
export const sevTint: Record<Severity, string> = {
  critical: "#fdecec",
  serious: "#fef1e2",
  moderate: "#fbf4dc",
  minor: "#f0f1f4",
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
