"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { DEFAULT_URL, type Status } from "./shared";
import { CenterState, PrintStyles, Toolbar } from "./chrome";
import { SummaryPage } from "./summary-page";
import { FindingsPage } from "./findings-page";
import { ProgressPage } from "./progress-page";

export function ReportView({ initialUrl }: { initialUrl: string }) {
  const start = initialUrl || DEFAULT_URL;
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const scan = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) return;
    setStatus("loading");
    setError("");
    setUrl(value);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed.");
      setResult(json as ScanResult);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    scan(initialUrl || DEFAULT_URL);
  }, [initialUrl, scan]);

  return (
    <div className="ac-canvas min-h-screen bg-canvas font-sans text-ink">
      <PrintStyles />
      <Toolbar url={url} status={status} />

      {status === "loading" && (
        <CenterState
          icon={faSpinner}
          spin
          progress
          title="Building report…"
          subtitle={`Rendering ${url} and running the WCAG audit.`}
        />
      )}

      {status === "error" && (
        <CenterState
          icon={faTriangleExclamation}
          tone="critical"
          title="Couldn’t build the report"
          subtitle={error}
          action={
            <Link
              href="/"
              className="mt-2 rounded-[10px] bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              New scan
            </Link>
          }
        />
      )}

      {status === "done" && result && (
        <div className="flex flex-col items-center gap-8 overflow-x-auto px-5 py-10">
          <SummaryPage result={result} />
          <FindingsPage result={result} />
          <ProgressPage result={result} />
        </div>
      )}
    </div>
  );
}
