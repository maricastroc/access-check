"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase } from "@/lib/scan/types";
import { TYPICAL_SCAN_MS } from "@/lib/scan/policy";
import { usePageAudit } from "@/hooks/use-page-audit";
import { ProgressCard, ScanStages, useElapsed } from "@/components/ui";
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

function BuildingReport({ url, phase }: { url: string; phase: ScanPhase }) {
  const elapsed = useElapsed();

  return (
    <div className="px-4 py-16">
      <ProgressCard
        target={url}
        elapsedMs={elapsed}
        budgetMs={TYPICAL_SCAN_MS}
        note="The report is built from a fresh audit of this page, run right now."
        status={`Building the report for ${url}. ${PHASE_DETAIL[phase]}`}
      >
        <ScanStages phase={phase} />
      </ProgressCard>
    </div>
  );
}

export function ReportView({ initialUrl }: { initialUrl: string }) {
  const { status, result, phase, url, error } = usePageAudit({
    initialUrl,
    fallbackError: "We couldn't build the report. Please try again.",
  });

  return (
    <div className="ac-canvas min-h-screen bg-canvas font-sans text-ink">
      <PrintStyles />
      <Toolbar url={url} status={status} />

      <main id="main">
        {status === "loading" && <BuildingReport url={url} phase={phase} />}

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
