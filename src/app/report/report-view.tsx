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
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/t";

const PAGE_WIDTH = 816;

const PHASE_DETAIL_KEY: Record<ScanPhase, MessageKey> = {
  preparing: "report.phase.preparing",
  loading: "report.phase.loading",
  auditing: "report.phase.auditing",
  processing: "report.phase.processing",
  finalizing: "report.phase.finalizing",
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
  const t = useT();
  const elapsed = useElapsed();

  return (
    <div className="px-4 py-16">
      <ProgressCard
        target={url}
        elapsedMs={elapsed}
        budgetMs={TYPICAL_SCAN_MS}
        note={t("report.freshNote")}
        status={t("report.buildingStatus", { url, detail: t(PHASE_DETAIL_KEY[phase]) })}
      >
        <ScanStages t={t} phase={phase} />
      </ProgressCard>
    </div>
  );
}

export function ReportView({ initialUrl }: { initialUrl: string }) {
  const t = useT();
  const { status, result, phase, url, error } = usePageAudit({
    initialUrl,
    fallbackError: t("report.buildFailed"),
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
            title={t("report.buildFailedTitle")}
            subtitle={error}
            action={
              <Link
                href="/"
                className="mt-2 bg-ink px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
              >
                {t("report.newAudit")}
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
