import type { ScanPhase, ScanResult } from "./types";

export type ScanStreamEvent =
  | { type: "phase"; phase: ScanPhase }
  | { type: "core"; result: ScanResult }
  | { type: "result"; result: ScanResult | Omit<ScanResult, "screenshot"> }
  | { type: "error"; error: string };

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
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error || "Scan failed.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: ScanResult | null = null;

  readLoop: for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const evt = JSON.parse(line) as ScanStreamEvent;
      if (evt.type === "phase") handlers.onPhase?.(evt.phase);
      else if (evt.type === "core") {
        latest = evt.result;
        handlers.onCore?.(evt.result);
      } else if (evt.type === "result") {
        latest = evt.result as ScanResult;
        break readLoop;
      } else if (evt.type === "error" && !latest) {
        throw new Error(evt.error);
      }
    }
  }

  if (!latest) throw new Error("Scan failed.");
  return latest;
}
