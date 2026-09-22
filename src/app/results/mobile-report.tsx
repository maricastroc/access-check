"use client";

import { VIEWPORT_CAPTURE, type ScanResult } from "@/lib/scan/types";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import {
  Button,
  ElementIdentityLine,
  FindingDetail,
  FindingRow,
  PriorityList,
  SectionKicker,
  WcagChips,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { langAttrs } from "@/lib/i18n/locale";
import { CaptureStage } from "./evidence-frame";
import { FocusPathList } from "./focus-path-list";
import { PendingStanding, StaleScoringNotice } from "./summary-band";
import {
  scoringIsCurrent,
  standingOf,
  STANDING_LABEL,
  STANDING_NOTE,
  STANDING_TONE,
} from "@/lib/report/standing";
import { focusPathLines } from "@/lib/report/focus-coverage";
import type { StopPlacement } from "@/lib/scan/placement";
import { type ActiveCapture, type Layer, type MarkerView, type StopView } from "./report-ui";
import { useT } from "@/lib/i18n/provider";

export function MobileReport({
  result,
  host,
  breakdown,
  wcag,
  layer,
  findings,
  selectedFinding,
  selectedId,
  onSelect,
  onOpenEvidence,
  markerViews,
  selectedStop,
  onSelectStop,
  stopViews,
  stopPlacement,
  capture,
  onBackToFirst,
  onStepStop,
  onSelectMarker,
  tab,
  setTab,
  onMarkdown,
  quickFromSite = false,
  onRunFull,
  pending = false,
}: {
  result: ScanResult;
  host: string;
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
  layer: Layer;
  findings: FindingView[];
  selectedFinding: FindingView | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenEvidence: (id: string) => void;
  markerViews: MarkerView[];
  selectedStop: number | null;
  onSelectStop: (n: number) => void;
  stopViews: StopView[];
  stopPlacement: StopPlacement | null;
  capture: ActiveCapture;
  onBackToFirst: () => void;
  onStepStop: (delta: 1 | -1) => void;
  onSelectMarker: (markerN: number) => void;
  tab: "capture" | "findings";
  setTab: (t: "capture" | "findings") => void;
  onMarkdown: () => void;
  quickFromSite?: boolean;
  onRunFull?: () => void;
  pending?: boolean;
}) {
  const t = useT();
  const focusStops = result.keyboard?.focusPath ?? [];
  const coverage = result.keyboard ? focusPathLines(result.keyboard, t) : { line: "", notes: [] };
  return (
    <div className="pb-20">
      <div className="sticky top-15.5 z-20 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[12.5px] text-muted">{host}</span>
          <span className="shrink-0 text-[12px] text-muted tabular-nums">
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mt-2" aria-live="polite">
          {pending ? (
            <PendingStanding t={t} size="sm" />
          ) : (
            <>
              <p
                className="font-cond text-[30px] leading-[1.05]"
                style={{ color: STANDING_TONE[standingOf(result.counts)] }}
              >
                {t(STANDING_LABEL[standingOf(result.counts)])}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-normal text-body">
                {t(STANDING_NOTE[standingOf(result.counts)])}
              </p>
            </>
          )}
        </div>
        {!pending && (
          <>
            <div className="mt-2.5">
              <PriorityList breakdown={breakdown} t={t} />
            </div>
            {!scoringIsCurrent(result) && (
              <div className="mt-2.5">
                <StaleScoringNotice t={t} />
              </div>
            )}
            <div className="mt-2.5">
              <WcagChips model={wcag} t={t} />
            </div>
          </>
        )}
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
          <div className="border border-ink">
            {capture.id !== VIEWPORT_CAPTURE && (
              <div className="flex justify-end border-b border-ink px-3 py-2">
                <Button variant="tertiary" size="sm" onClick={onBackToFirst}>
                  {t("capture.backToFirst")}
                </Button>
              </div>
            )}
            <CaptureStage
              host={host}
              layer={layer}
              markerViews={markerViews}
              selectedFinding={selectedFinding}
              onSelectMarker={onSelectMarker}
              stopViews={stopViews}
              selectedStop={selectedStop}
              stopPlacement={stopPlacement}
              onSelectStop={onSelectStop}
              capture={capture}
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
                <div className="mt-1">
                  <ElementIdentityLine finding={selectedFinding} t={t} />
                </div>
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
          {focusStops.length > 0 && (
            <div className="mt-2 border-t border-hairline pt-3">
              <SectionKicker tone="steel">{t("results.focusPathStops")}</SectionKicker>
              <div className="mt-2">
                <FocusPathList
                  t={t}
                  stops={focusStops}
                  coverage={coverage}
                  selected={selectedStop}
                  onSelect={(n) => {
                    onSelectStop(n);
                    setTab("capture");
                  }}
                  onStep={onStepStop}
                />
              </div>
            </div>
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
