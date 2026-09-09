import type { ScanErrorCode, ScanPhase, ScanResult } from "./types";
import { translator, type MessageKey, type Translate } from "../i18n/t";

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

const HINT_KEY: Record<ScanErrorCode, MessageKey> = {
  "invalid-url": "scanError.hint.invalidUrl",
  "blocked-url": "scanError.hint.blockedUrl",
  "rate-limited": "scanError.hint.rateLimited",
  "navigation-timeout": "scanError.hint.navigationTimeout",
  "navigation-failed": "scanError.hint.navigationFailed",
  "http-error": "scanError.hint.httpError",
  "audit-failed": "scanError.hint.auditFailed",
  "browser-unavailable": "scanError.hint.browserUnavailable",
  timeout: "scanError.hint.timeout",
  interrupted: "scanError.hint.interrupted",
  internal: "scanError.hint.internal",
};

const MESSAGE_KEY: Record<ScanErrorCode, MessageKey> = {
  "invalid-url": "scanError.message.invalidUrl",
  "blocked-url": "scanError.message.blockedUrl",
  "rate-limited": "scanError.message.rateLimited",
  "navigation-timeout": "scanError.message.navigationTimeout",
  "navigation-failed": "scanError.message.navigationFailed",
  "http-error": "scanError.message.httpError",
  "audit-failed": "scanError.message.auditFailed",
  "browser-unavailable": "scanError.message.browserUnavailable",
  timeout: "scanError.message.timeout",
  interrupted: "scanError.message.interrupted",
  internal: "scanError.message.internal",
};

export function scanErrorHint(code: ScanErrorCode, t: Translate): string {
  return t(HINT_KEY[code]);
}

function fallbackMessage(code: ScanErrorCode, t: Translate): string {
  return t(MESSAGE_KEY[code]);
}

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

function markInterrupted(result: ScanResult, t: Translate): ScanResult {
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
            message: t("scanWarning.streamInterrupted"),
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
  options: { signal?: AbortSignal; force?: boolean; t?: Translate } = {},
): Promise<ScanResult> {
  const t = options.t ?? translator();
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.force ? { url, force: true } : { url }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: ScanErrorCode };
    const code = json.code ?? codeFromStatus(res.status);
    throw new ScanStreamError(json.error || fallbackMessage(code, t), code);
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
          if (latest) return markInterrupted(latest, t);
          throw new ScanStreamError(evt.error || fallbackMessage(evt.code, t), evt.code);
        }
      }
    }
  } finally {
    reader.cancel().catch(() => null);
  }

  if (latest) return markInterrupted(latest, t);
  throw new ScanStreamError(fallbackMessage("interrupted", t), "interrupted");
}
