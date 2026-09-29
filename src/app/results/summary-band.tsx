import type { ScanResult } from "@/lib/scan/types";
import type { WcagReadingModel } from "@/lib/report/wcag";
import {
  scoringIsCurrent,
  standingOf,
  STANDING_LABEL,
  STANDING_NOTE,
  STANDING_TONE,
} from "@/lib/report/standing";
import { workLine } from "./report-model";
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

export function PendingStanding({ t, size }: { t: Translate; size: "lg" | "sm" }) {
  return (
    <>
      <p
        className={`font-cond leading-[1.05] text-muted ${size === "lg" ? "mt-1 text-[40px]" : "text-[30px]"}`}
      >
        {t("standing.pending")}
      </p>
      <p
        className={`max-w-[560px] leading-normal text-body ${size === "lg" ? "mt-1 text-[13.5px]" : "mt-0.5 text-[12.5px]"}`}
      >
        {t("standing.pendingNote")}
      </p>
    </>
  );
}

export function SummaryBand({
  result,
  wcag,
  t,
  pending = false,
}: {
  result: ScanResult;
  wcag: WcagReadingModel;
  t: Translate;
  pending?: boolean;
}) {
  const standing = standingOf(result.counts);
  const work = workLine(result, t);

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 items-end gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div aria-live="polite">
          <SectionKicker>{t("standing.kicker")}</SectionKicker>
          {pending ? (
            <PendingStanding t={t} size="lg" />
          ) : (
            <>
              <p
                className="mt-1 font-cond text-[34px] leading-[1.05]"
                style={{ color: STANDING_TONE[standing] }}
              >
                {t(STANDING_LABEL[standing])}
              </p>
              <p className="mt-1 max-w-[560px] text-[13.5px] leading-normal text-body">
                {t(STANDING_NOTE[standing])}
              </p>
              {!scoringIsCurrent(result) && (
                <p className="mt-1.5 text-[12.5px] font-semibold text-moderate-text">
                  {t("standing.staleTitle")}
                </p>
              )}
            </>
          )}
        </div>

        {!pending && (
          <div className="lg:pl-8">
            {work && <p className="text-[14px] font-semibold text-ink tabular-nums">{work}</p>}
            <WcagChips t={t} model={wcag} className={work ? "mt-2.5" : undefined} />
          </div>
        )}
      </div>
    </section>
  );
}
