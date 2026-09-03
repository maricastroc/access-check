"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScanPhase, ScanResult } from "@/lib/scan/types";
import { streamScan, ScanStreamError, SCAN_ERROR_HINT } from "@/lib/scan/stream";
import { buildFindings, orderedMarkers } from "@/lib/report/findings";
import { scoreBreakdown } from "@/lib/report/score";
import { buildWcagReading } from "@/lib/report/wcag";
import { buildReportMarkdown, reportMarkdownFilename } from "@/lib/report/markdown";
import { ColorBlindFilters } from "./color-blind-filters";
import { DEFAULT_URL, clamp, safeHost, type Status } from "./shared";
import { type SimKey } from "./data";
import { buildMarkerViews, type Layer } from "./report-ui";
import { TopBar } from "./top-bar";
import { SummaryBand } from "./summary-band";
import { VisionRail } from "./vision-rail";
import { EvidenceFrame, type FocusPoint } from "./evidence-frame";
import { FindingsMargin } from "./findings-margin";
import { MobileReport } from "./mobile-report";
import { ScanningState, ErrorState, PartialNotice } from "./states";

const VIEWPORT_LABEL = "1200 × 800";

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
  const [url, setUrl] = useState(start);
  const [input, setInput] = useState(start);
  const [status, setStatus] = useState<Status>(initialResult ? "done" : "loading");
  const [result, setResult] = useState<ScanResult | null>(initialResult);
  const [phase, setPhase] = useState<ScanPhase>("preparing");
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState("");

  // presentation state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [occurrenceIndex, setOccurrenceIndex] = useState(0);
  const [sim, setSim] = useState<SimKey>("normal");
  const [layer, setLayer] = useState<Layer>("markers");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"capture" | "findings">("capture");

  const desktop = useIsDesktop();

  const runFetch = useCallback(async (value: string) => {
    setPhase("preparing");
    const apply = (r: ScanResult) => {
      setResult(r);
      setUrl(r.finalUrl || value);
      setStatus("done");
    };
    try {
      apply(await streamScan(value, { onPhase: setPhase, onCore: apply }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The scan failed unexpectedly.");
      setErrorHint(e instanceof ScanStreamError ? SCAN_ERROR_HINT[e.code] : "");
      setStatus("error");
    }
  }, []);

  const scan = useCallback(
    (target: string) => {
      const value = target.trim();
      if (!value) return;
      setStatus("loading");
      setError("");
      setErrorHint("");
      setUrl(value);
      setSelectedId(null);
      void runFetch(value);
    },
    [runFetch],
  );

  useEffect(() => {
    if (initialResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runFetch(initialUrl || DEFAULT_URL);
  }, [initialUrl, initialResult, runFetch]);

  // derived view-models
  const findings = useMemo(() => (result ? buildFindings(result) : []), [result]);
  const breakdown = useMemo(
    () => (result ? scoreBreakdown(result.violations, result.score) : null),
    [result],
  );
  const wcag = useMemo(() => (result ? buildWcagReading(result.violations) : null), [result]);

  const markerOwner = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of findings) for (const m of f.markers) map.set(m.n, f.id);
    return map;
  }, [findings]);

  const selectedFinding = useMemo(
    () => findings.find((f) => f.id === selectedId) ?? null,
    [findings, selectedId],
  );

  const focusPoints: FocusPoint[] = useMemo(() => {
    return (result?.keyboard?.focusPath ?? [])
      .filter((s) => s.left !== null && s.top !== null)
      .map((s) => ({
        n: s.n,
        cx: clamp(s.left! + (s.width ?? 0) / 2, 2, 98),
        cy: clamp(s.top! + (s.height ?? 0) / 2, 2, 98),
        visible: s.focusVisible,
        label: s.label,
      }));
  }, [result]);

  const effectiveLayer: Layer = result?.screenshot ? layer : "none";

  const markerViews = useMemo(
    () => (result ? buildMarkerViews(orderedMarkers(result), selectedFinding, occurrenceIndex) : []),
    [result, selectedFinding, occurrenceIndex],
  );

  const host = result ? safeHost(result.finalUrl) : safeHost(url);

  const selectFinding = useCallback((id: string) => {
    setSelectedId(id);
    setOccurrenceIndex(0);
  }, []);

  const selectMarker = useCallback(
    (markerN: number) => {
      const ownerId = markerOwner.get(markerN);
      if (!ownerId) return;
      setSelectedId(ownerId);
      const owner = findings.find((f) => f.id === ownerId);
      const idx = owner ? owner.markers.findIndex((m) => m.n === markerN) : 0;
      setOccurrenceIndex(idx < 0 ? 0 : idx);
    },
    [findings, markerOwner],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!selectedFinding) return;
      const total = selectedFinding.markers.length;
      if (total <= 1) return;
      setOccurrenceIndex((i) => clamp(i + dir, 0, total - 1));
    },
    [selectedFinding],
  );

  // scroll the margin to the selected finding
  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => {
      document.getElementById(`finding-${selectedId}`)?.scrollIntoView({ block: "center" });
    }, 20);
    return () => window.clearTimeout(id);
  }, [selectedId]);

  // Esc clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        onRerun={() => scan(url)}
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

        {status === "done" && result && breakdown && wcag && (
          <>
            {siteId && initialResult && (
              <div className="mx-auto w-full max-w-[1560px] px-4 pt-4 sm:px-6">
                <div className="flex flex-col items-start gap-2 border border-border bg-surface px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-body">
                    <span className="font-semibold text-ink">Quick scan from the site audit.</span>{" "}
                    Run the full analysis to add the capture, keyboard and sandbox passes.
                  </p>
                  <button
                    onClick={() => scan(url)}
                    className="shrink-0 bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-surface hover:bg-ink-2"
                  >
                    Run full analysis
                  </button>
                </div>
              </div>
            )}

            {(result.partial || (result.warnings?.length ?? 0) > 0) && (
              <PartialNotice warnings={result.warnings ?? []} onRerun={() => scan(url)} />
            )}

            {desktop ? (
              <>
                <SummaryBand result={result} breakdown={breakdown} wcag={wcag} />
                <div
                  className="mx-auto grid w-full max-w-[1560px] grid-cols-[60px_minmax(0,1fr)_420px] items-start"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") step(-1);
                    if (e.key === "ArrowRight") step(1);
                  }}
                >
                  <div className="sticky top-[62px] self-start">
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
                      focusPoints={focusPoints}
                      selectedFinding={selectedFinding}
                      occurrenceIndex={occurrenceIndex}
                      onPrev={() => step(-1)}
                      onNext={() => step(1)}
                      onSelectMarker={selectMarker}
                    />
                  </div>
                  <div className="scroll-slim sticky top-[62px] max-h-[calc(100vh-62px)] self-start overflow-y-auto">
                    <FindingsMargin
                      findings={findings}
                      result={result}
                      host={host}
                      selectedId={selectedId}
                      onSelect={selectFinding}
                    />
                  </div>
                </div>
              </>
            ) : (
              <MobileReport
                result={result}
                host={host}
                breakdown={breakdown}
                wcag={wcag}
                sim={sim}
                setSim={setSim}
                layer={effectiveLayer}
                findings={findings}
                selectedFinding={selectedFinding}
                selectedId={selectedId}
                onSelect={selectFinding}
                occurrenceIndex={occurrenceIndex}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                markerViews={markerViews}
                focusPoints={focusPoints}
                onSelectMarker={selectMarker}
                tab={mobileTab}
                setTab={setMobileTab}
                onMarkdown={exportMarkdown}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
