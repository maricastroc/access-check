"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase } from "@/lib/scan/types";
import { usePageAudit } from "@/hooks/use-page-audit";
import { DEFAULT_URL } from "./shared";
import { CenterState, PrintStyles, Toolbar } from "./chrome";
import { SummaryPage } from "./summary-page";
import { FindingsPage } from "./findings-page";
import { ProgressPage } from "./progress-page";

const PAGE_WIDTH = 816;

const PHASE_DETAIL: Record<ScanPhase, string> = {
  preparing: "Starting a browser and getting the page ready.",
  loading: "Opening the page and letting it finish loading.",
  auditing: "Running the WCAG checks on the loaded page.",
  processing: "Grouping findings and matching them to WCAG checkpoints.",
  finalizing: "Scoring and putting the report together.",
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
  const { status, result, phase, url, error } = usePageAudit({
    initialUrl: initialUrl || DEFAULT_URL,
    fallbackError: "We couldn't build the report. Please try again.",
  });

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
                className="mt-2 bg-ink px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
              >
                New audit
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
