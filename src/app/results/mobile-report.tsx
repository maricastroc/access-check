"use client";

import type { ScanResult } from "@/lib/scan/types";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import {
  Button,
  FindingDetail,
  FindingRow,
  Ruler,
  SectionKicker,
  WcagChips,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { langAttrs } from "@/lib/i18n/locale";
import { modeList, type SimKey } from "./data";
import { CaptureStage, PartialOverviewNote, type FocusPoint } from "./evidence-frame";
import { type ActiveCapture, type Layer, type MarkerView } from "./report-ui";
import { useT } from "@/lib/i18n/provider";

const MOBILE_MODES: SimKey[] = ["normal", "deuteranopia", "grayscale"];

export function MobileReport({
  capture,
  overviewTop,
  result,
  host,
  breakdown,
  wcag,
  sim,
  setSim,
  layer,
  findings,
  selectedFinding,
  selectedId,
  onSelect,
  onOpenEvidence,
  markerViews,
  focusPoints,
  onSelectMarker,
  tab,
  setTab,
  onMarkdown,
  quickFromSite = false,
  onRunFull,
  pending = false,
}: {
  capture: ActiveCapture;
  overviewTop?: number | null;
  result: ScanResult;
  host: string;
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
  sim: SimKey;
  setSim: (s: SimKey) => void;
  layer: Layer;
  findings: FindingView[];
  selectedFinding: FindingView | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenEvidence: (id: string) => void;
  markerViews: MarkerView[];
  focusPoints: FocusPoint[];
  onSelectMarker: (markerN: number) => void;
  tab: "capture" | "findings";
  setTab: (t: "capture" | "findings") => void;
  onMarkdown: () => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();
  return (
    <div className="pb-20">
      <div className="sticky top-15.5 z-20 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[12.5px] text-muted">{host}</span>
          <span className="shrink-0 text-[12px] text-muted tabular-nums">
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-cond text-[38px] leading-none text-ink tabular-nums">
            {result.score}
          </span>
          <div className="flex-1">
            <Ruler
              t={t}
              variant="score"
              score={result.score}
              deductions={breakdown.deductions}
              height={20}
            />
          </div>
        </div>
        <div className="mt-2.5">
          <WcagChips model={wcag} t={t} />
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t("results.reportView")}
        className="grid grid-cols-2 border-b border-ink"
      >
        {(["capture", "findings"] as const).map((pane) => (
          <button
            key={pane}
            role="tab"
            aria-selected={tab === pane}
            onClick={() => setTab(pane)}
            className={cn(
              "flex h-12.5 cursor-pointer items-center justify-center text-[15px] font-semibold",
              tab === pane ? "bg-ink text-surface" : "bg-surface text-ink",
            )}
          >
            {pane === "capture"
              ? t("capture.screenshot")
              : t("results.findingsCount", { count: findings.length })}
          </button>
        ))}
      </div>

      {tab === "capture" ? (
        <div className="p-4">
          <div className="mb-3 inline-flex border border-border" role="tablist" aria-label="Vision">
            {MOBILE_MODES.map((m, i) => (
              <button
                key={m}
                role="tab"
                aria-selected={sim === m}
                onClick={() => setSim(m)}
                className={cn(
                  "flex h-10 cursor-pointer items-center px-4 text-[13px] font-medium",
                  i > 0 && "border-l border-border",
                  sim === m ? "bg-ink text-surface" : "bg-surface text-ink",
                )}
              >
                {(() => {
                  const found = modeList.find((x) => x.key === m);
                  return found ? t(found.label) : m;
                })()}
              </button>
            ))}
          </div>

          <div className="border border-ink">
            {capture.partial && capture.tiles && capture.tiles.length > 0 && (
              <PartialOverviewNote capture={capture} />
            )}
            <CaptureStage
              capture={capture}
              overviewTop={overviewTop}
              host={host}
              sim={sim}
              layer={layer}
              markerViews={markerViews}
              focusPoints={focusPoints}
              selectedFinding={selectedFinding}
              onSelectMarker={onSelectMarker}
              height={300}
              quickFromSite={quickFromSite}
              onRunFull={onRunFull}
              pending={pending}
            />
          </div>

          {selectedFinding ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-muted">
                  {t("unit.element", { count: selectedFinding.elements })} ·{" "}
                  {t("capture.shownOnScreenshot", { count: locatedMarkers(selectedFinding) })}
                </span>
                <Button variant="primary" size="md" onClick={() => setTab("findings")}>
                  {t("results.viewFinding")}
                </Button>
              </div>
              <div className="mt-3 border border-border bg-surface p-3">
                <p className="text-[15px] font-semibold text-ink">{selectedFinding.title}</p>
                <p className="mt-1 font-mono text-[12px] text-steel">
                  {selectedFinding.affectedSelectors[0] ?? selectedFinding.ruleId}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13.5px] text-muted">{t("results.tapMarker")}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {findings.length === 0 ? (
            <p className="text-[13.5px] text-muted">{t("results.noFailuresMobile")}</p>
          ) : (
            findings.map((f) => (
              <div key={f.id} {...langAttrs(result.locale)}>
                <FindingRow
                  t={t}
                  finding={f}
                  selected={f.id === selectedId}
                  onSelect={() => onSelect(f.id)}
                />
                {f.id === selectedId && (
                  <>
                    <FindingDetail
                      t={t}
                      finding={f}
                      host={host}
                      onOpenEvidence={() => onOpenEvidence(f.id)}
                    />
                    {locatedMarkers(f) > 0 && (
                      <div className="mt-2">
                        <Button variant="secondary" size="md" onClick={() => setTab("capture")}>
                          {t("results.showOnScreenshot")}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
          <div className="mt-2">
            <SectionKicker tone="steel">
              {result.counts.passed} passed · {result.counts.manualReview} need review
            </SectionKicker>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface px-4 py-2.5">
        <Button variant="secondary" size="md" onClick={onMarkdown} className="flex-1">
          {t("results.exportMarkdown")}
        </Button>
        <Button
          href={`/report?url=${encodeURIComponent(result.finalUrl)}`}
          variant="primary"
          size="md"
          className="flex-1"
        >
          {t("results.exportPdf")}
        </Button>
      </div>
    </div>
  );
}
