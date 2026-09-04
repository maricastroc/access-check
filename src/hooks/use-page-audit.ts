"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScanPhase, ScanResult } from "@/lib/scan/types";
import { streamScan, ScanStreamError, SCAN_ERROR_HINT } from "@/lib/scan/stream";

export type AuditStatus = "loading" | "done" | "error";

export type PageAudit = {
  status: AuditStatus;
  result: ScanResult | null;
  phase: ScanPhase;
  url: string;
  error: string;
  errorHint: string;
  scan: (target: string) => void;
};

export function usePageAudit({
  initialUrl,
  initialResult = null,
  fallbackError,
  incremental = false,
}: {
  initialUrl: string;
  initialResult?: ScanResult | null;
  fallbackError: string;
  incremental?: boolean;
}): PageAudit {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<AuditStatus>(initialResult ? "done" : "loading");
  const [result, setResult] = useState<ScanResult | null>(initialResult);
  const [phase, setPhase] = useState<ScanPhase>("preparing");
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState("");

  const scan = useCallback(
    (target: string) => {
      const value = target.trim();
      if (!value) return;
      setStatus("loading");
      setPhase("preparing");
      setError("");
      setErrorHint("");
      setUrl(value);

      const apply = (r: ScanResult) => {
        setResult(r);
        setUrl(r.finalUrl || value);
        setStatus("done");
      };

      void (async () => {
        try {
          apply(
            await streamScan(value, { onPhase: setPhase, onCore: incremental ? apply : undefined }),
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : fallbackError);
          setErrorHint(e instanceof ScanStreamError ? SCAN_ERROR_HINT[e.code] : "");
          setStatus("error");
        }
      })();
    },
    [fallbackError, incremental],
  );

  useEffect(() => {
    if (initialResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scan(initialUrl);
  }, [initialUrl, initialResult, scan]);

  return { status, result, phase, url, error, errorHint, scan };
}
