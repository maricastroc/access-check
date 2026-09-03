import type { ScanErrorCode, ScanPhase, ScanResult } from "./types";

export type ScanStreamEvent =
  | { type: "phase"; phase: ScanPhase }
  | { type: "core"; result: ScanResult }
  | { type: "result"; result: ScanResult | Omit<ScanResult, "screenshot"> }
  | { type: "error"; error: string; code: ScanErrorCode };

export class ScanStreamError extends Error {
  constructor(
    message: string,
    readonly code: ScanErrorCode,
  ) {
    super(message);
    this.name = "ScanStreamError";
  }
}

export const SCAN_ERROR_HINT: Record<ScanErrorCode, string> = {
  "invalid-url": "Check the address and try again.",
  "blocked-url": "Only public http and https pages can be scanned.",
  "rate-limited": "Wait a moment before starting another scan.",
  "navigation-timeout": "The site may be slow or blocking automated browsers.",
  "navigation-failed": "Check the address, or the site may be offline.",
  "http-error": "The page may be wrong, removed, or behind a login.",
  "audit-failed": "This page is unusually heavy — try a specific page instead of the home page.",
  "browser-unavailable": "Give it a moment and try again.",
  timeout: "This page is unusually heavy — try a specific page instead of the home page.",
  interrupted: "The connection dropped mid-scan. Try again.",
  internal: "Something went wrong on our side. Try again.",
};

const FALLBACK_MESSAGE: Record<ScanErrorCode, string> = {
  "invalid-url": "That address could not be read.",
  "blocked-url": "That address cannot be scanned.",
  "rate-limited": "Too many scans. Try again in a minute.",
  "navigation-timeout": "The page took too long to respond.",
  "navigation-failed": "The page could not be reached.",
  "http-error": "The page returned an error.",
  "audit-failed": "The audit could not finish on this page.",
  "browser-unavailable": "The scan browser could not be started.",
  timeout: "The scan ran out of time on this page.",
  interrupted: "The scan stopped before finishing.",
  internal: "The scan failed unexpectedly.",
};

function codeFromStatus(status: number): ScanErrorCode {
  if (status === 429) return "rate-limited";
  if (status === 400) return "invalid-url";
  return "internal";
}

function carryScreenshot(
  next: ScanResult | Omit<ScanResult, "screenshot">,
  previous: ScanResult | null,
): ScanResult {
  const merged = { ...next } as ScanResult;
  if (!merged.screenshot) merged.screenshot = previous?.screenshot ?? null;
  return merged;
}

function markInterrupted(result: ScanResult): ScanResult {
  const warnings = result.warnings ?? [];
  return {
    ...result,
    partial: true,
    warnings: warnings.some((w) => w.code === "stream-interrupted")
      ? warnings
      : [
          ...warnings,
          {
            code: "stream-interrupted",
            message: "The scan was cut short before every pass finished.",
          },
        ],
  };
}

type StreamHandlers = {
  onPhase?: (phase: ScanPhase) => void;
  onCore?: (result: ScanResult) => void;
};

export async function streamScan(
  url: string,
  handlers: StreamHandlers = {},
  options: { signal?: AbortSignal } = {},
): Promise<ScanResult> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: ScanErrorCode };
    const code = json.code ?? codeFromStatus(res.status);
    throw new ScanStreamError(json.error || FALLBACK_MESSAGE[code], code);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: ScanResult | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;

        let evt: ScanStreamEvent;
        try {
          evt = JSON.parse(line) as ScanStreamEvent;
        } catch {
          continue;
        }

        if (evt.type === "phase") {
          handlers.onPhase?.(evt.phase);
        } else if (evt.type === "core") {
          latest = evt.result;
          handlers.onCore?.(evt.result);
        } else if (evt.type === "result") {
          return carryScreenshot(evt.result, latest);
        } else if (evt.type === "error") {
          if (latest) return markInterrupted(latest);
          throw new ScanStreamError(evt.error || FALLBACK_MESSAGE[evt.code], evt.code);
        }
      }
    }
  } finally {
    reader.cancel().catch(() => null);
  }

  if (latest) return markInterrupted(latest);
  throw new ScanStreamError(FALLBACK_MESSAGE.interrupted, "interrupted");
}
