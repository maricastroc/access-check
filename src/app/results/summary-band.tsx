import type { ScanResult } from "@/lib/scan/types";
import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { severityLabel, severityTextVar } from "@/lib/report/severity";
import {
  countedSeverities,
  scoringIsCurrent,
  standingOf,
  STANDING_LABEL,
  STANDING_NOTE,
  STANDING_TONE,
} from "@/lib/report/standing";
import { SectionKicker, WcagChips } from "@/components/ui";
import type { Translate } from "@/lib/i18n/t";

export function StaleScoringNotice({ t }: { t: Translate }) {
  return (
    <div className="border border-dashed border-border bg-band px-3.5 py-3">
      <SectionKicker>{t("standing.staleTitle")}</SectionKicker>
      <p className="mt-1.5 text-[12.5px] leading-normal text-body">{t("standing.staleBody")}</p>
    </div>
  );
}

export function PriorityList({ breakdown, t }: { breakdown: ScoreBreakdown; t: Translate }) {
  if (breakdown.deductions.length === 0) {
    return <p className="text-[13px] text-muted">{t("priority.nothing")}</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {breakdown.deductions.map((d) => (
        <li key={d.severity} className="flex items-baseline gap-2.5">
          <span
            aria-hidden
            className="mt-1 inline-block h-2.5 w-2.5 shrink-0"
            style={{ background: severityTextVar[d.severity] }}
          />
          <span className="text-[13.5px] leading-normal text-ink">
            <span className="font-semibold" style={{ color: severityTextVar[d.severity] }}>
              {d.issues} {severityLabel(d.severity, t).toLowerCase()}
            </span>{" "}
            <span className="text-muted">
              {t("priority.elements", { count: d.elements })} ·{" "}
              <span className="tabular-nums">{t("priority.share", { share: d.share })}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SummaryBand({
  result,
  breakdown,
  wcag,
  t,
}: {
  result: ScanResult;
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
  t: Translate;
}) {
  const { counts } = result;
  const standing = standingOf(counts);
  const counted = countedSeverities(counts);

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-x-8 gap-y-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <SectionKicker>{t("standing.kicker")}</SectionKicker>
          <p
            className="mt-1 font-cond text-[40px] leading-[1.05]"
            style={{ color: STANDING_TONE[standing] }}
          >
            {t(STANDING_LABEL[standing])}
          </p>
          <p className="mt-1 max-w-[560px] text-[13.5px] leading-normal text-body">
            {t(STANDING_NOTE[standing])}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-body">
            {counted.map((row) => (
              <span key={row.severity} className="flex items-center gap-1.5">
                <span className="font-semibold" style={{ color: severityTextVar[row.severity] }}>
                  {t("standing.issueCount", {
                    count: row.issues,
                    severity: severityLabel(row.severity, t).toLowerCase(),
                  })}
                </span>
                <span aria-hidden className="text-border">
                  ·
                </span>
              </span>
            ))}
            <span>
              <span className="font-semibold text-ink tabular-nums">{counts.passed}</span> passed
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="text-muted tabular-nums">
              {t("results.manualReviewItems", { count: counts.manualReview })}
              {t("results.outsideScore")}
            </span>
          </div>

          {!scoringIsCurrent(result) && (
            <div className="mt-4 max-w-[560px]">
              <StaleScoringNotice t={t} />
            </div>
          )}
        </div>

        <div className="border-t border-hairline pt-5 lg:border-t-0 lg:border-l lg:border-border lg:pt-0 lg:pl-8">
          <p className="text-[15px] leading-normal text-body">{result.summary}</p>
          <div className="mt-4">
            <SectionKicker>{t("priority.kicker")}</SectionKicker>
            <p className="mt-1 mb-2.5 text-[12.5px] leading-normal text-muted">
              {t("priority.note")}
            </p>
            <PriorityList breakdown={breakdown} t={t} />
          </div>
          <div className="mt-4">
            <WcagChips t={t} model={wcag} />
          </div>
        </div>
      </div>
    </section>
  );
}
