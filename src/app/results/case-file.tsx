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
  ProblemNav,
  Summary,
  type FindingGroups,
  type Investigation,
  type RelatedFinding,
} from "@/components/investigation";
import { cn } from "@/lib/cn";
import { PendingStanding } from "./summary-band";

export function CaseSummary({
  result,
  groups,
  wcag,
  selectedId,
  onSelect,
  onHover,
  host,
  compact = false,
  pending = false,
  t,
}: {
  result: ScanResult;
  groups: FindingGroups;
  wcag: WcagReadingModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  host: string;
  compact?: boolean;
  pending?: boolean;
  t: Translate;
}) {
  return (
    <div className={cn("pt-8 pb-4", compact ? "px-4" : "px-6")} aria-live="polite">
      {pending ? (
        <PendingStanding t={t} size={compact ? "sm" : "lg"} />
      ) : (
        <Summary
          standing={standingOf(result.counts)}
          groups={groups}
          passed={result.counts.passed}
          selectedId={selectedId}
          onSelect={onSelect}
          onHover={onHover}
          headingId="standing-heading"
          host={host}
          compact={compact}
          t={t}
        >
          <WcagChips t={t} model={wcag} className="mt-4" />
          {!scoringIsCurrent(result) && (
            <p className="mt-3 text-[13.5px] font-semibold text-steel">
              {t("standing.staleTitle")}
            </p>
          )}
        </Summary>
      )}
    </div>
  );
}

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
  summary = true,
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
  summary?: boolean;
  t: Translate;
}) {
  const stops = result.keyboard?.focusPath ?? [];
  const coverage = result.keyboard ? focusPathLines(result.keyboard, t) : null;
  const pad = compact ? "px-4" : "px-6";

  return (
    <div>
      {summary && (
        <CaseSummary
          result={result}
          groups={groups}
          wcag={wcag}
          selectedId={inv.selectedId}
          onSelect={(id) => inv.select(id, 0, "index")}
          onHover={onHover}
          host={host}
          compact={compact}
          pending={pending}
          t={t}
        />
      )}

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
        renderOpen={(f, siblings, i) => {
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
              footer={
                <ProblemNav
                  siblings={siblings}
                  at={i}
                  onGo={(id) => inv.select(id, 0, "nav")}
                  t={t}
                />
              }
              t={t}
            />
          );
        }}
      />

      {coverage && stops.length > 0 && (
        <section aria-labelledby="focus-heading" className={cn("pt-4 pb-8", pad)}>
          <h2 id="focus-heading" className="text-[15px] font-semibold text-ink-2">
            {t("panel.focusPath")}
          </h2>
          <p className="mt-1.5 text-[15px] leading-normal text-ink-2">{coverage.line}</p>
          {coverage.notes.map((note) => (
            <p key={note} className="mt-1.5 text-[13.5px] leading-normal text-steel">
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
