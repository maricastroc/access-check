"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScanErrorCode, ScanPhase, ScanResult } from "@/lib/scan/types";
import { streamScan, ScanStreamError, scanErrorHint } from "@/lib/scan/stream";
import { useLocale, useT } from "@/lib/i18n/provider";
import { recallScan, rememberScan } from "@/lib/scan/result-cache";

export type AuditStatus = "loading" | "done" | "error";

export type AuditOptions = {
  force?: boolean;
};

export type PageAudit = {
  status: AuditStatus;
  streaming: boolean;
  result: ScanResult | null;
  phase: ScanPhase;
  url: string;
  error: string;
  errorHint: string;
  errorCode: ScanErrorCode | null;
  scan: (target: string, options?: AuditOptions) => void;
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
  const t = useT();
  const locale = useLocale();
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<AuditStatus>(initialResult ? "done" : "loading");
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(initialResult);
  const [phase, setPhase] = useState<ScanPhase>("preparing");
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState("");
  const [errorCode, setErrorCode] = useState<ScanErrorCode | null>(null);

  const scan = useCallback(
    (target: string, { force = false }: AuditOptions = {}) => {
      const value = target.trim();
      if (!value) return;

      const apply = (r: ScanResult) => {
        setResult(r);
        setUrl(r.finalUrl || value);
        setStatus("done");
      };

      const cached = force ? null : recallScan(value, locale);
      if (cached) {
        setError("");
        setErrorHint("");
        setErrorCode(null);
        setStreaming(false);
        apply(cached);
        return;
      }

      setStatus("loading");
      setStreaming(false);
      setPhase("preparing");
      setError("");
      setErrorHint("");
      setErrorCode(null);
      setUrl(value);

      void (async () => {
        try {
          const fresh = await streamScan(
            value,
            {
              onPhase: setPhase,
              onCore: incremental
                ? (core) => {
                    setStreaming(true);
                    apply(core);
                  }
                : undefined,
            },
            { force, t },
          );
          rememberScan(fresh, value);
          setStreaming(false);
          apply(fresh);
        } catch (e) {
          setError(e instanceof Error ? e.message : fallbackError);
          setErrorHint(e instanceof ScanStreamError ? scanErrorHint(e.code, t) : "");
          setErrorCode(e instanceof ScanStreamError ? e.code : null);
          setStreaming(false);
          setStatus("error");
        }
      })();
    },
    [fallbackError, incremental, locale, t],
  );

  useEffect(() => {
    if (initialResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scan(initialUrl);
  }, [initialUrl, initialResult, scan]);

  return { status, streaming, result, phase, url, error, errorHint, errorCode, scan };
}
