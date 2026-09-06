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
  "blocked-url": "Only public web pages can be audited.",
  "rate-limited": "Wait a moment before starting another audit.",
  "navigation-timeout": "The site may be slow, or it may block automated browsers.",
  "navigation-failed": "Check the address, or the site may be offline.",
  "http-error": "The address may be wrong, removed, or behind a login.",
  "audit-failed": "This page is unusually heavy. Try one specific page instead of the home page.",
  "browser-unavailable": "Give it a moment and try again.",
  timeout: "This page is unusually heavy. Try one specific page instead of the home page.",
  interrupted: "The connection dropped during the audit. Try again.",
  internal: "Something went wrong on our side. Try again.",
};

const FALLBACK_MESSAGE: Record<ScanErrorCode, string> = {
  "invalid-url": "We couldn't read that address.",
  "blocked-url": "That address can't be audited.",
  "rate-limited": "Too many audits in a short time. Try again in a minute.",
  "navigation-timeout": "The page took too long to respond.",
  "navigation-failed": "We couldn't reach the page.",
  "http-error":
    "The page returned an error, so we couldn't audit it. Check the address and try again.",
  "audit-failed": "We couldn't finish the audit on this page.",
  "browser-unavailable": "We couldn't start the browser used to open the page. Please try again.",
  timeout: "The audit ran out of time on this page.",
  interrupted: "The audit stopped before finishing.",
  internal: "The audit stopped before it could finish. Please try again.",
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
            message: "The audit was cut short before every check finished.",
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
  options: { signal?: AbortSignal; force?: boolean } = {},
): Promise<ScanResult> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.force ? { url, force: true } : { url }),
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
