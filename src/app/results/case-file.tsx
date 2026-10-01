"use client";

import type { ReactNode } from "react";
import type { ScanResult } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import type { Occurrence } from "@/lib/report/occurrences";
import { scoringIsCurrent, standingOf } from "@/lib/report/standing";
import { focusPathLines } from "@/lib/report/focus-coverage";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { langAttrs } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/t";
import { WcagChips } from "@/components/ui";
import {
  EvidenceChain,
  FindingList,
  FocusSequence,
  Summary,
  type FindingGroups,
  type RelatedFinding,
} from "@/components/investigation";
import { cn } from "@/lib/cn";
import { PendingStanding } from "./summary-band";
import type { Investigation } from "./use-investigation";

export function CaseFile({
  result,
  groups,
  wcag,
  inv,
  host,
  hoveredId,
  onHover,
  located,
  figure,
  focus,
  compact = false,
  pending = false,
  t,
}: {
  result: ScanResult;
  groups: FindingGroups;
  wcag: WcagReadingModel;
  inv: Investigation;
  host: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  located?: (f: FindingView, occ: Occurrence | null) => ReactNode;
  figure?: (f: FindingView, occ: Occurrence | null) => ReactNode;
  focus: {
    current: number | null;
    onPick: (n: number) => void;
    onStep: (delta: 1 | -1) => void;
    whole: boolean;
    onWhole: (on: boolean) => void;
    related: RelatedFinding[];
  };
  compact?: boolean;
  pending?: boolean;
  t: Translate;
}) {
  const findings = groups.flatMap((g) => g.findings);
  const stops = result.keyboard?.focusPath ?? [];
  const coverage = result.keyboard ? focusPathLines(result.keyboard, t) : null;
  const pad = compact ? "px-4" : "px-6";

  const nav = (f: FindingView) => {
    const at = findings.findIndex((x) => x.id === f.id);
    const previous = findings[at - 1] ?? null;
    const next = findings[at + 1] ?? null;
    if (!previous && !next) return null;
    return (
      <nav
        aria-label={t("panel.problemNavigation")}
        className="mt-5 flex flex-wrap items-center justify-between gap-3 pl-11 text-[13.5px]"
      >
        <button
          type="button"
          disabled={!previous}
          onClick={() => previous && inv.select(previous.id, 0, "nav")}
          className="flex min-h-8 cursor-pointer items-center gap-2 text-ink disabled:cursor-default disabled:text-disabled"
        >
          <span aria-hidden>←</span>
          {t("panel.previousProblem")}
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && inv.select(next.id, 0, "nav")}
          className="flex min-h-8 cursor-pointer items-center gap-2 font-semibold text-ink disabled:cursor-default disabled:font-normal disabled:text-disabled"
        >
          {t("panel.nextProblem")}
          <span aria-hidden>→</span>
        </button>
      </nav>
    );
  };

  return (
    <div>
      <div className={cn("pt-8 pb-4", pad)} aria-live="polite">
        {pending ? (
          <PendingStanding t={t} size={compact ? "sm" : "lg"} />
        ) : (
          <Summary
            standing={standingOf(result.counts)}
            groups={groups}
            passed={result.counts.passed}
            selectedId={inv.selectedId}
            onSelect={(id) => inv.select(id, 0, "index")}
            onHover={onHover}
            headingId="standing-heading"
            host={host}
            compact={compact}
            t={t}
          >
            <WcagChips t={t} model={wcag} className="mt-4" />
            {!scoringIsCurrent(result) && (
              <p className="mt-3 text-[13px] font-semibold text-moderate-text">
                {t("standing.staleTitle")}
              </p>
            )}
          </Summary>
        )}
      </div>

      <FindingList
        groups={groups}
        selectedId={inv.selectedId}
        onToggle={inv.toggle}
        hoveredId={hoveredId}
        onHover={onHover}
        compact={compact}
        empty={t("results.nothingToFix")}
        rowAttrs={langAttrs(result.locale)}
        t={t}
        renderOpen={(f) => {
          const occ = inv.occurrences[inv.occIndex] ?? null;
          return (
            <EvidenceChain
              finding={f}
              occurrences={inv.occurrences}
              index={inv.occIndex}
              onPick={inv.pick}
              host={host}
              compact={compact}
              located={located?.(f, occ)}
              figure={figure?.(f, occ)}
              footer={nav(f)}
              t={t}
            />
          );
        }}
      />

      {coverage && stops.length > 0 && (
        <section aria-labelledby="focus-heading" className={cn("pt-4 pb-8", pad)}>
          <h2 id="focus-heading" className="text-[14px] font-semibold text-ink-2">
            {t("panel.focusPath")}
          </h2>
          <p className="mt-1.5 text-[14px] leading-normal text-ink-2">{coverage.line}</p>
          {coverage.notes.map((note) => (
            <p key={note} className="mt-1.5 text-[13.5px] leading-normal text-moderate-text">
              {note}
            </p>
          ))}
          <div className="mt-3">
            <FocusSequence
              stops={stops}
              current={focus.current}
              onPick={focus.onPick}
              onStep={focus.onStep}
              whole={focus.whole}
              onWhole={focus.onWhole}
              related={focus.related}
              compact={compact}
              t={t}
            />
          </div>
        </section>
      )}
    </div>
  );
}
