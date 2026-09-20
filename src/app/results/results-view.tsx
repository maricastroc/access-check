"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import { orderedMarkers } from "@/lib/report/findings";
import { buildReportMarkdown, reportMarkdownFilename } from "@/lib/report/markdown";
import { usePageAudit } from "@/hooks/use-page-audit";
import { safeHost } from "./shared";
import {
  buildMarkerViews,
  buildStopViews,
  captureById,
  captureForFinding,
  markersOfCapture,
  selectedStopPlacement,
  stepFocusStop,
  type Layer,
} from "./report-ui";
import { VIEWPORT_CAPTURE } from "@/lib/scan/types";
import { buildReportView } from "./report-model";
import { useFindingSelection } from "./use-finding-selection";
import { TopBar } from "./top-bar";
import { SummaryBand } from "./summary-band";
import { LayerRail } from "./layer-rail";
import { EvidenceFrame } from "./evidence-frame";
import { FindingsMargin } from "./findings-margin";
import { MobileReport } from "./mobile-report";
import { ScanningState, ErrorState, PartialNotice } from "./states";
import { useT } from "@/lib/i18n/provider";

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
  const t = useT();
  const audit = usePageAudit({
    initialUrl,
    initialResult,
    incremental: true,
    fallbackError: t("scanError.message.internal"),
  });
  const { status, streaming, result, phase, url, error, errorHint, scan } = audit;

  const [input, setInput] = useState(initialUrl);

  const [layer, setLayer] = useState<Layer>("markers");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"capture" | "findings">("capture");

  const desktop = useIsDesktop();

  const view = useMemo(() => (result ? buildReportView(result) : null), [result]);
  const selection = useFindingSelection(view?.findings ?? NO_FINDINGS);

  const effectiveLayer: Layer = result?.screenshot ? layer : "none";
  const allMarkerViews = useMemo(
    () => (result ? buildMarkerViews(orderedMarkers(result), selection.selectedFinding, t) : []),
    [result, selection.selectedFinding, t],
  );

  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [stopsFrom, setStopsFrom] = useState(result);

  if (stopsFrom !== result) {
    setStopsFrom(result);
    setSelectedStop(null);
  }

  const focusStops = useMemo(() => result?.keyboard?.focusPath ?? [], [result]);

  const regions = useMemo(() => result?.regions ?? [], [result]);
  const [captureId, setCaptureId] = useState<string>(VIEWPORT_CAPTURE);

  const [captureFrom, setCaptureFrom] = useState(result);
  if (captureFrom !== result) {
    setCaptureFrom(result);
    setCaptureId(VIEWPORT_CAPTURE);
  }

  const stopWhere = useMemo(
    () => selectedStopPlacement(focusStops, selectedStop, regions),
    [focusStops, selectedStop, regions],
  );

  const selectStop = useCallback(
    (n: number) => {
      setSelectedStop(n);
      setLayer("focus");
      const where = selectedStopPlacement(focusStops, n, regions);
      if (where?.kind === "placed" || where?.kind === "region-missed") {
        setCaptureId(where.captureId);
      }
    },
    [focusStops, regions],
  );

  const wantedCapture = captureForFinding(selection.selectedFinding);
  const [markerFrom, setMarkerFrom] = useState(wantedCapture);
  if (markerFrom !== wantedCapture) {
    setMarkerFrom(wantedCapture);
    if (wantedCapture) setCaptureId(wantedCapture);
  }

  const capture = useMemo(
    () => captureById(captureId, result?.screenshot ?? null, regions),
    [captureId, result, regions],
  );

  const stopViews = useMemo(
    () => buildStopViews(focusStops, selectedStop, captureId, regions),
    [focusStops, selectedStop, captureId, regions],
  );

  const markerViews = useMemo(
    () => markersOfCapture(allMarkerViews, captureId),
    [allMarkerViews, captureId],
  );

  const stepStop = useCallback(
    (delta: 1 | -1) => {
      const next = stepFocusStop(focusStops, selectedStop, delta);
      if (next !== null) setSelectedStop(next);
    },
    [focusStops, selectedStop],
  );

  const openEvidence = useCallback(
    (id: string) => {
      selection.selectFinding(id);
      setMobileTab("capture");
    },
    [selection],
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
                    <span className="font-semibold text-ink">{t("results.quickFromSite")}</span>{" "}
                    {t("results.runFullAuditNote")}
                  </p>
                  <button
                    onClick={() => scan(url, { force: true })}
                    className="shrink-0 cursor-pointer bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-surface hover:bg-ink-2"
                  >
                    {t("capture.runFull")}
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
                <SummaryBand t={t} result={result} breakdown={view.breakdown} wcag={view.wcag} />
                <div className="mx-auto grid w-full max-w-[1560px] grid-cols-[164px_minmax(0,1fr)_420px] items-start">
                  <div className="sticky top-15.5 self-start">
                    <LayerRail
                      layer={layer}
                      setLayer={setLayer}
                      layerDisabled={!result.screenshot}
                      focusDisabled={focusStops.length === 0}
                      collapsed={collapsed}
                      onToggleCollapse={() => setCollapsed((c) => !c)}
                    />
                  </div>
                  <div className="p-4">
                    <EvidenceFrame
                      result={result}
                      host={host}
                      capture={capture}
                      onBackToFirst={() => setCaptureId(VIEWPORT_CAPTURE)}
                      layer={effectiveLayer}
                      collapsed={collapsed}
                      onToggleCollapse={() => setCollapsed((c) => !c)}
                      markerViews={markerViews}
                      selectedFinding={selection.selectedFinding}
                      onSelectMarker={selection.selectMarker}
                      stopViews={stopViews}
                      selectedStop={selectedStop}
                      stopPlacement={stopWhere}
                      onSelectStop={selectStop}
                      quickFromSite={quickFromSite}
                      onRunFull={() => scan(url, { force: true })}
                      pending={streaming}
                    />
                  </div>
                  <div className="scroll-slim sticky top-15.5 max-h-[calc(100vh-62px)] self-start overflow-y-auto">
                    <FindingsMargin
                      t={t}
                      findings={view.findings}
                      result={result}
                      host={host}
                      selectedId={selection.selectedId}
                      onSelect={selection.toggleFinding}
                      onOpenEvidence={openEvidence}
                      selectedStop={selectedStop}
                      onSelectStop={selectStop}
                      onStepStop={stepStop}
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
                layer={effectiveLayer}
                capture={capture}
                onBackToFirst={() => setCaptureId(VIEWPORT_CAPTURE)}
                findings={view.findings}
                selectedFinding={selection.selectedFinding}
                selectedId={selection.selectedId}
                onSelect={selection.toggleFinding}
                onOpenEvidence={openEvidence}
                markerViews={markerViews}
                selectedStop={selectedStop}
                onSelectStop={selectStop}
                onStepStop={stepStop}
                stopViews={stopViews}
                stopPlacement={stopWhere}
                onSelectMarker={selection.selectMarker}
                tab={mobileTab}
                setTab={setMobileTab}
                onMarkdown={exportMarkdown}
                quickFromSite={quickFromSite}
                onRunFull={() => scan(url, { force: true })}
                pending={streaming}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
