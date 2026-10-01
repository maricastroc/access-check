"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
import { VIEWPORT_CAPTURE } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import { findingsAtStops, occurrenceTag } from "@/lib/report/occurrences";
import { chainOf } from "@/lib/report/chain";
import { buildReportMarkdown, reportMarkdownFilename } from "@/lib/report/markdown";
import { usePageAudit } from "@/hooks/use-page-audit";
import {
  Connector,
  Tag,
  chipOf,
  sevOf,
  useInvestigation,
  type RelatedFinding,
} from "@/components/investigation";
import { useT } from "@/lib/i18n/provider";
import { safeHost } from "./shared";
import { evidenceFigure } from "./evidence-figure";
import {
  buildStopViews,
  captureById,
  captureOfOccurrence,
  marksOnCapture,
  occurrencePlaces,
  selectedStopPlacement,
  stepFocusStop,
  type Layer,
} from "./report-ui";
import { buildReportView } from "./report-model";
import { TopBar } from "./top-bar";
import { InvestigationSurface } from "./investigation-surface";
import { CaseFile } from "./case-file";
import { MobileReport } from "./mobile-report";
import { ScanningState, ErrorState } from "./states";
import { AboutAudit } from "./about-audit";

const VIEWPORT_LABEL = "1200 × 800";
const NO_FINDINGS: FindingView[] = [];
const WIDE = 1280;

function useMedia(query: string, initial: boolean) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
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
  const [mobileTab, setMobileTab] = useState<"capture" | "findings">("capture");
  const [hovered, setHovered] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer>("findings");
  const [wholePath, setWholePath] = useState(false);
  const desktop = useMedia("(min-width: 1024px)", true);
  const wide = useMedia(`(min-width: ${WIDE}px)`, true);

  const view = useMemo(() => (result ? buildReportView(result) : null), [result]);
  const inv = useInvestigation(view?.findings ?? NO_FINDINGS);
  const regions = useMemo(() => result?.regions ?? [], [result]);
  const focusStops = useMemo(() => result?.keyboard?.focusPath ?? [], [result]);
  const current = inv.occurrences[inv.occIndex] ?? null;

  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [captureId, setCaptureId] = useState<string>(VIEWPORT_CAPTURE);
  const [resetFor, setResetFor] = useState(result);
  if (resetFor !== result) {
    setResetFor(result);
    setSelectedStop(null);
    setCaptureId(VIEWPORT_CAPTURE);
  }

  const followKey = `${inv.selectedId}:${inv.occIndex}`;
  const [followed, setFollowed] = useState(followKey);
  if (followed !== followKey) {
    setFollowed(followKey);
    if (inv.selected) {
      const stop = current?.keyboard ? current.stop : null;
      if (stop !== null) {
        setSelectedStop(stop);
        if (layer !== "none") setLayer("path");
      } else if (layer === "path") {
        setLayer("findings");
      }
      const wanted = captureOfOccurrence(current, focusStops, regions);
      if (wanted) setCaptureId(wanted);
    }
  }

  const pickStop = useCallback(
    (n: number) => {
      setSelectedStop(n);
      setLayer("path");
      const where = selectedStopPlacement(focusStops, n, regions);
      if (where?.kind === "placed" || where?.kind === "region-missed")
        setCaptureId(where.captureId);
      const at = inv.selected?.occurrences.findIndex((o) => o.stop === n) ?? -1;
      if (at >= 0) inv.pick(at);
    },
    [focusStops, regions, inv],
  );

  const stepStop = useCallback(
    (delta: 1 | -1) => {
      const next = stepFocusStop(focusStops, selectedStop, delta);
      if (next !== null) pickStop(next);
    },
    [focusStops, selectedStop, pickStop],
  );

  const capture = useMemo(
    () => captureById(captureId, result?.screenshot ?? null, regions),
    [captureId, result, regions],
  );
  const marks = useMemo(
    () => (view ? marksOnCapture(view.findings, captureId, focusStops, regions, t) : []),
    [view, captureId, focusStops, regions, t],
  );
  const stopViews = useMemo(
    () => buildStopViews(focusStops, selectedStop, captureId, regions),
    [focusStops, selectedStop, captureId, regions],
  );
  const stopWhere = useMemo(
    () => selectedStopPlacement(focusStops, selectedStop, regions),
    [focusStops, selectedStop, regions],
  );
  const related: RelatedFinding[] = useMemo(
    () =>
      findingsAtStops(view?.findings ?? []).map((r) => ({
        stop: r.stop,
        tag: r.tag,
        onOpen: () => inv.select(r.findingId, r.index, "stop"),
      })),
    [view, inv],
  );

  const selectMark = useCallback(
    (findingId: string, index: number) => {
      inv.select(findingId, index, "mark");
    },
    [inv],
  );

  const host = view?.host ?? safeHost(url);
  const quickFromSite = Boolean(siteId) && result !== null && result === initialResult;
  const anchorStop = current?.keyboard ? current.stop : null;
  const ring = inv.selected?.ruleId === "focus-not-visible";
  const shownLayer: Layer = result?.screenshot ? layer : "none";
  const currentOnCapture =
    current !== null &&
    occurrencePlaces(current, focusStops, regions).some((p) => p.captureId === captureId);

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

  const surface = (compact: boolean) =>
    result && (
      <InvestigationSurface
        result={result}
        host={host}
        capture={capture}
        onBackToFirst={() => setCaptureId(VIEWPORT_CAPTURE)}
        layer={shownLayer}
        onLayer={setLayer}
        marks={marks}
        selectedId={inv.selectedId}
        occIndex={inv.occIndex}
        hoveredId={hovered}
        ring={ring}
        stops={stopViews}
        sequence={focusStops.map((s) => s.n)}
        currentStop={selectedStop}
        anchorStop={anchorStop}
        stopWhere={stopWhere}
        wholePath={wholePath}
        onSelectMark={(id, index) => {
          selectMark(id, index);
          if (compact) setMobileTab("findings");
        }}
        onSelectStop={pickStop}
        onHover={setHovered}
        quickFromSite={quickFromSite}
        onRunFull={() => scan(url, { force: true })}
        pending={streaming}
        compact={compact}
        t={t}
      />
    );

  const focus = {
    current: selectedStop,
    onPick: pickStop,
    onStep: stepStop,
    whole: wholePath,
    onWhole: setWholePath,
    related,
  };

  return (
    <div className="ac-instrument min-h-screen bg-canvas font-sans text-ink">
      <TopBar
        result={status === "done" ? result : null}
        viewport={VIEWPORT_LABEL}
        siteId={siteId}
        onRerun={() => scan(url, { force: true })}
        onMarkdown={exportMarkdown}
        busy={status === "loading" || streaming}
        pending={streaming}
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
              <div className="flex flex-col items-start gap-2 border-b border-hairline bg-surface px-5 py-3 text-[14px] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-2">
                  <span className="font-semibold text-ink">{t("results.quickFromSite")}</span>{" "}
                  {t("results.runFullAuditNote")}
                </p>
                <button
                  onClick={() => scan(url, { force: true })}
                  className="shrink-0 cursor-pointer bg-ink px-3.5 py-1.5 text-[14px] font-semibold text-surface hover:bg-ink-2"
                >
                  {t("capture.runFull")}
                </button>
              </div>
            )}

            {desktop ? (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start xl:grid-cols-[minmax(0,1fr)_clamp(420px,32vw,520px)]">
                  {surface(false)}
                  <div id="case-file" className="min-w-0 border-l border-hairline bg-canvas">
                    <CaseFile
                      result={result}
                      groups={view.groups}
                      wcag={view.wcag}
                      inv={inv}
                      host={host}
                      hoveredId={hovered}
                      onHover={setHovered}
                      figure={(f, occ) => evidenceFigure(f, occ, result, t)}
                      located={(f, occ) =>
                        occ && occurrencePlaces(occ, focusStops, regions).length === 0 ? (
                          <p className="mt-2 text-[13.5px] text-muted">{t("chain.notOnCapture")}</p>
                        ) : null
                      }
                      focus={focus}
                      pending={streaming}
                      t={t}
                    />
                  </div>
                </div>
                <AboutAudit
                  result={result}
                  viewport={result.screenshot ? VIEWPORT_LABEL : undefined}
                  quickFromSite={quickFromSite}
                  onRerun={() => scan(url, { force: true })}
                />
              </>
            ) : (
              <MobileReport
                result={result}
                groups={view.groups}
                wcag={view.wcag}
                inv={inv}
                host={host}
                capture={surface(true)}
                tab={mobileTab}
                setTab={setMobileTab}
                focus={focus}
                onMarkdown={exportMarkdown}
                onRerun={() => scan(url, { force: true })}
                quickFromSite={quickFromSite}
                viewport={result.screenshot ? VIEWPORT_LABEL : undefined}
                pending={streaming}
                t={t}
              />
            )}
          </>
        )}
      </main>

      {desktop && wide && inv.selected && currentOnCapture && shownLayer !== "none" && (
        <Connector
          from='[data-anchor="locus-current"]'
          to='[data-anchor="station-located"]'
          fromBounds="#capture-scroll"
          belowOf="#top-bar"
          gutter="#case-file"
          gutterOffset={-16}
          minWidth={WIDE}
          redrawKey={`${inv.selectedId}:${inv.occIndex}:${shownLayer}:${captureId}`}
          dashed={!chainOf(inv.selected, current).measured}
          labelAfter="#capture-figure"
          label={
            <Tag
              n={occurrenceTag(inv.selected.n, inv.occIndex, inv.occurrences.length)}
              sev={sevOf(inv.selected)}
              size={24}
              onPage
            >
              {chipOf(inv.selected, inv.occIndex, t) && (
                <span className="font-medium">{chipOf(inv.selected, inv.occIndex, t)}</span>
              )}
            </Tag>
          }
        />
      )}
    </div>
  );
}
