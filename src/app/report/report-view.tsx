"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase, ScanResult } from "@/lib/scan/types";
import { streamScan } from "@/lib/scan/stream";
import { DEFAULT_URL, type Status } from "./shared";
import { CenterState, PrintStyles, Toolbar } from "./chrome";
import { SummaryPage } from "./summary-page";
import { FindingsPage } from "./findings-page";
import { ProgressPage } from "./progress-page";

const PAGE_WIDTH = 816;

const PHASE_DETAIL: Record<ScanPhase, string> = {
  preparing: "Starting a browser and preparing the page.",
  loading: "Fetching and rendering the full DOM.",
  auditing: "Running the WCAG audit against the rendered page.",
  processing: "Grouping findings and mapping success criteria.",
  finalizing: "Scoring and assembling the report.",
};

function FitToWidth({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = String(Math.min(1, (window.innerWidth - 32) / PAGE_WIDTH));
    };
    const reset = () => {
      el.style.zoom = "1";
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("beforeprint", reset);
    window.addEventListener("afterprint", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("beforeprint", reset);
      window.removeEventListener("afterprint", fit);
    };
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-8 px-4 py-10">
      {children}
    </div>
  );
}

export function ReportView({ initialUrl }: { initialUrl: string }) {
  const start = initialUrl || DEFAULT_URL;
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("preparing");
  const [error, setError] = useState("");

  const scan = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) return;
    setStatus("loading");
    setPhase("preparing");
    setError("");
    setUrl(value);
    try {
      const scanned = await streamScan(value, { onPhase: setPhase });
      setResult(scanned);
      setUrl(scanned.finalUrl || value);
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

      <main id="main">
        {status === "loading" && (
          <CenterState
            icon={faSpinner}
            spin
            progress
            title="Building report…"
            subtitle={PHASE_DETAIL[phase]}
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
                className="mt-2 rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                New scan
              </Link>
            }
          />
        )}

        {status === "done" && result && (
          <FitToWidth>
            <SummaryPage result={result} />
            <FindingsPage result={result} />
            <ProgressPage result={result} />
          </FitToWidth>
        )}
      </main>
    </div>
  );
}
