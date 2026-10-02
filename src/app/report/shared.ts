import type { MessageKey } from "@/lib/i18n/t";
import type { Severity } from "@/lib/scan/types";

export type Status = "loading" | "done" | "error";

export const sevColor: Record<Severity, string> = {
  critical: "var(--color-critical)",
  serious: "var(--color-serious)",
  moderate: "var(--color-moderate)",
  minor: "var(--color-muted)",
};
export const sevLabelKey: Record<Severity, MessageKey> = {
  critical: "severity.critical",
  serious: "severity.serious",
  moderate: "severity.moderate",
  minor: "severity.minor",
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
