"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import { orderedMarkers } from "@/lib/report/findings";
import { buildReportMarkdown, reportMarkdownFilename } from "@/lib/report/markdown";
import { usePageAudit } from "@/hooks/use-page-audit";
import { ColorBlindFilters } from "./color-blind-filters";
import { DEFAULT_URL, safeHost } from "./shared";
import { type SimKey } from "./data";
import { buildMarkerViews, type Layer } from "./report-ui";
import { buildReportView } from "./report-model";
import { useFindingSelection } from "./use-finding-selection";
import { TopBar } from "./top-bar";
import { SummaryBand } from "./summary-band";
import { VisionRail } from "./vision-rail";
import { EvidenceFrame } from "./evidence-frame";
import { FindingsMargin } from "./findings-margin";
import { MobileReport } from "./mobile-report";
import { ScanningState, ErrorState, PartialNotice } from "./states";

const VIEWPORT_LABEL = "1200 × 800";
const NO_FINDINGS: FindingView[] = [];

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function ResultsView({
  initialUrl,
  siteId,
  initialResult,
}: {
  initialUrl: string;
  siteId: string | null;
  initialResult: ScanResult | null;
}) {
  const start = initialUrl || DEFAULT_URL;
  const audit = usePageAudit({
    initialUrl: start,
    initialResult,
    incremental: true,
    fallbackError: "The audit stopped before it could finish. Please try again.",
  });
  const { status, result, phase, url, error, errorHint, scan } = audit;

  const [input, setInput] = useState(start);

  const [sim, setSim] = useState<SimKey>("normal");
  const [layer, setLayer] = useState<Layer>("markers");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"capture" | "findings">("capture");

  const desktop = useIsDesktop();

  const view = useMemo(() => (result ? buildReportView(result) : null), [result]);
  const selection = useFindingSelection(view?.findings ?? NO_FINDINGS);

  const effectiveLayer: Layer = result?.screenshot ? layer : "none";
  const markerViews = useMemo(
    () => (result ? buildMarkerViews(orderedMarkers(result), selection.selectedFinding) : []),
    [result, selection.selectedFinding],
  );
  const host = view?.host ?? safeHost(url);

  const quickFromSite = Boolean(siteId) && result !== null && result === initialResult;

  const exportMarkdown = useCallback(() => {
    if (!result) return;
    const blob = new Blob([buildReportMarkdown(result)], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = reportMarkdownFilename(result);
    a.click();
    URL.revokeObjectURL(href);
  }, [result]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <ColorBlindFilters />
      <TopBar
        result={status === "done" ? result : null}
        viewport={VIEWPORT_LABEL}
        siteId={siteId}
        onRerun={() => scan(url, { force: true })}
        onMarkdown={exportMarkdown}
        busy={status === "loading"}
      />

      <main id="main">
        {status === "loading" && <ScanningState url={url} phase={phase} />}

        {status === "error" && (
          <ErrorState
            url={input}
            message={error}
            hint={errorHint}
            onChange={setInput}
            onRetry={() => scan(input)}
          />
        )}

        {status === "done" && result && view && (
          <>
            {quickFromSite && (
              <div className="mx-auto w-full max-w-[1560px] px-4 pt-4 sm:px-6">
                <div className="flex flex-col items-start gap-2 border border-border bg-surface px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-body">
                    <span className="font-semibold text-ink">
                      Quick result from the site audit.
                    </span>{" "}
                    Run the full audit to add the screenshot, keyboard checks and fix testing.
                  </p>
                  <button
                    onClick={() => scan(url, { force: true })}
                    className="shrink-0 cursor-pointer bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-surface hover:bg-ink-2"
                  >
                    Run full audit
                  </button>
                </div>
              </div>
            )}

            {(result.partial || (result.warnings?.length ?? 0) > 0) && (
              <PartialNotice
                warnings={result.warnings ?? []}
                onRerun={() => scan(url, { force: true })}
              />
            )}

            {desktop ? (
              <>
                <SummaryBand result={result} breakdown={view.breakdown} wcag={view.wcag} />
                <div className="mx-auto grid w-full max-w-[1560px] grid-cols-[164px_minmax(0,1fr)_420px] items-start">
                  <div className="sticky top-15.5 self-start">
                    <VisionRail
                      sim={sim}
                      setSim={setSim}
                      layer={layer}
                      setLayer={setLayer}
                      layerDisabled={!result.screenshot}
                      collapsed={collapsed}
                      onToggleCollapse={() => setCollapsed((c) => !c)}
                    />
                  </div>
                  <div className="p-4">
                    <EvidenceFrame
                      result={result}
                      host={host}
                      sim={sim}
                      layer={effectiveLayer}
                      collapsed={collapsed}
                      onToggleCollapse={() => setCollapsed((c) => !c)}
                      markerViews={markerViews}
                      focusPoints={view.focusPoints}
                      selectedFinding={selection.selectedFinding}
                      onSelectMarker={selection.selectMarker}
                      quickFromSite={quickFromSite}
                      onRunFull={() => scan(url, { force: true })}
                    />
                  </div>
                  <div className="scroll-slim sticky top-15.5 max-h-[calc(100vh-62px)] self-start overflow-y-auto">
                    <FindingsMargin
                      findings={view.findings}
                      result={result}
                      host={host}
                      selectedId={selection.selectedId}
                      onSelect={selection.selectFinding}
                    />
                  </div>
                </div>
              </>
            ) : (
              <MobileReport
                result={result}
                host={host}
                breakdown={view.breakdown}
                wcag={view.wcag}
                sim={sim}
                setSim={setSim}
                layer={effectiveLayer}
                findings={view.findings}
                selectedFinding={selection.selectedFinding}
                selectedId={selection.selectedId}
                onSelect={selection.selectFinding}
                markerViews={markerViews}
                focusPoints={view.focusPoints}
                onSelectMarker={selection.selectMarker}
                tab={mobileTab}
                setTab={setMobileTab}
                onMarkdown={exportMarkdown}
                quickFromSite={quickFromSite}
                onRunFull={() => scan(url, { force: true })}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
