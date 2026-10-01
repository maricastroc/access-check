"use client";

import type { ReactNode } from "react";
import { SCAN_VIEWPORT, type ScanResult } from "@/lib/scan/types";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { Button } from "@/components/ui";
import {
  Crop,
  Locus,
  type FindingGroups,
  type Investigation,
  type RelatedFinding,
} from "@/components/investigation";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";
import { CaseFile } from "./case-file";
import { AboutAudit } from "./about-audit";
import { captureById, occurrencePlaces } from "./report-ui";
import { evidenceFigure } from "./evidence-figure";

export function MobileReport({
  result,
  groups,
  wcag,
  inv,
  host,
  capture,
  tab,
  setTab,
  focus,
  onMarkdown,
  onRerun,
  quickFromSite = false,
  viewport,
  pending = false,
  t,
}: {
  result: ScanResult;
  groups: FindingGroups;
  wcag: WcagReadingModel;
  inv: Investigation;
  host: string;
  capture: ReactNode;
  tab: "capture" | "findings";
  setTab: (tab: "capture" | "findings") => void;
  focus: {
    current: number | null;
    onPick: (n: number) => void;
    onStep: (delta: 1 | -1) => void;
    whole: boolean;
    onWhole: (on: boolean) => void;
    related: RelatedFinding[];
  };
  onMarkdown: () => void;
  onRerun: () => void;
  quickFromSite?: boolean;
  viewport?: string;
  pending?: boolean;
  t: Translate;
}) {
  const total = groups.reduce((sum, g) => sum + g.findings.length, 0);
  const stops = result.keyboard?.focusPath ?? [];
  const regions = result.regions ?? [];

  return (
    <div className="pb-20">
      <div
        role="tablist"
        aria-label={t("results.reportView")}
        className="sticky top-14 z-20 grid grid-cols-2 border-b border-ink bg-canvas"
      >
        {(["capture", "findings"] as const).map((pane) => (
          <button
            key={pane}
            role="tab"
            aria-selected={tab === pane}
            onClick={() => setTab(pane)}
            className={cn(
              "flex h-12.5 cursor-pointer items-center justify-center text-[15px] font-semibold",
              tab === pane ? "bg-ink text-surface" : "bg-canvas text-ink",
            )}
          >
            {pane === "capture"
              ? t("capture.screenshot")
              : t("results.findingsCount", { count: total })}
          </button>
        ))}
      </div>

      {tab === "capture" ? (
        <div>
          {capture}
          <div className="px-4 py-4">
            {inv.selected ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 text-[15px] font-semibold text-ink">{inv.selected.title}</p>
                <Button variant="primary" size="md" onClick={() => setTab("findings")}>
                  {t("results.viewFinding")}
                </Button>
              </div>
            ) : (
              <p className="text-[14px] text-ink-2">{t("results.tapMarker")}</p>
            )}
          </div>
        </div>
      ) : (
        <CaseFile
          result={result}
          groups={groups}
          wcag={wcag}
          inv={inv}
          host={host}
          hoveredId={null}
          onHover={() => {}}
          compact
          pending={pending}
          focus={{
            ...focus,
            onPick: (n) => {
              focus.onPick(n);
              setTab("capture");
            },
          }}
          figure={(f, occ) => evidenceFigure(f, occ, result, t)}
          located={(f, occ) => {
            const place = occ ? occurrencePlaces(occ, stops, regions)[0] : undefined;
            if (!occ || !place) {
              return occ ? (
                <p className="mt-2 text-[13.5px] text-muted">{t("chain.notOnCapture")}</p>
              ) : null;
            }
            const image = captureById(place.captureId, result.screenshot, regions).image;
            return (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {image && (
                  <Crop
                    src={image}
                    page={SCAN_VIEWPORT}
                    box={place.box}
                    maxW={300}
                    maxH={120}
                    label={t("chain.closeUp", { label: occ.identity?.name ?? occ.selector })}
                  >
                    {(inner) => <Locus box={inner} weight="current" />}
                  </Crop>
                )}
                <Button variant="secondary" size="sm" onClick={() => setTab("capture")}>
                  {t("results.showOnScreenshot")}
                </Button>
              </div>
            );
          }}
          t={t}
        />
      )}

      <AboutAudit
        result={result}
        viewport={viewport}
        quickFromSite={quickFromSite}
        onRerun={onRerun}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-hairline bg-surface px-4 py-2.5">
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
