"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { DEFAULT_URL, type Status } from "./shared";
import { CenterState, PrintStyles, Toolbar } from "./chrome";
import { SummaryPage } from "./summary-page";
import { FindingsPage } from "./findings-page";
import { ProgressPage } from "./progress-page";

// The report pages render at a fixed Letter width (w-204 = 816px) so the PDF
// stays print-accurate. On narrow screens we zoom the whole column to fit the
// viewport — `zoom` reflows layout (unlike transform), so heights collapse and
// centering still work. Reset to 1 around printing so the PDF prints full size.
const PAGE_WIDTH = 816;

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
    </div>
  );
}
