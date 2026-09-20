import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { PriorityList, SectionKicker, WcagReading } from "@/components/ui";
import { STANDING_LABEL, STANDING_NOTE, STANDING_TONE } from "@/lib/report/standing";
import { UrlForm } from "./url-form";
import { HeroEvidencePreview } from "./evidence-preview";
import { exampleScore, exampleSummary } from "./content";
import type { Translate } from "@/lib/i18n/t";

const breakdown: ScoreBreakdown = {
  base: 100,
  score: exampleScore.score,
  totalDeduction: 100 - exampleScore.score,
  deductions: exampleScore.deductions,
};

export function Hero({ t }: { t: Translate }) {
  const wcag: WcagReadingModel = {
    a: { fails: false, criteria: [] },
    aa: { fails: true, criteria: [{ sc: "1.4.3", name: t("wcag.1.4.3") }] },
    aaa: { evaluated: false },
  };

  return (
    <section className="border-b border-hairline bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6">
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 pt-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-start lg:gap-x-20">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <SectionKicker tone="steel">{t("home.hero.standards")}</SectionKicker>
              <span aria-hidden className="h-4 w-px bg-hairline" />
              <span className="text-[13px] text-muted">{t("home.hero.passes")}</span>
            </div>
            <h1 className="mt-5 font-sans text-[42px] leading-[1.05] font-semibold tracking-tight text-ink">
              {t("home.hero.title")}
            </h1>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-normal text-body">
              {t("home.hero.body")}
            </p>
            <div className="mt-6">
              <UrlForm examples={["wikipedia.org", "stripe.com", "github.com"]} />
            </div>
            <p className="mt-4 flex items-start gap-2.5 border-l-[3px] border-steel bg-steel/6 px-3 py-2 text-[13px] text-body">
              <SectionKicker tone="steel" className="mt-px shrink-0">
                {t("home.notSeal.kicker")}
              </SectionKicker>
              {t("home.notSeal.body")}
            </p>
          </div>

          <div className="lg:pt-1">
            <HeroEvidencePreview t={t} />
            <p className="mt-2.5 text-[12.5px] text-muted">{t("home.hero.lensNote")}</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 border border-border bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <span aria-hidden className="mb-2.5 block h-0.75 w-10 bg-steel" />
            <SectionKicker>{t("home.mostRecent")}</SectionKicker>
            <p
              className="mt-1 font-cond text-[48px] leading-[1.02]"
              style={{ color: STANDING_TONE[exampleScore.standing] }}
            >
              {t(STANDING_LABEL[exampleScore.standing])}
            </p>
            <p className="mt-1 max-w-[48ch] text-[14px] leading-normal text-body">
              {t(STANDING_NOTE[exampleScore.standing])}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-body">
              <span className="font-semibold text-serious">
                {t("standing.issueCount", {
                  count: exampleScore.serious,
                  severity: t("severity.serious").toLowerCase(),
                })}
              </span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="font-semibold text-moderate-text">
                {t("standing.issueCount", {
                  count: exampleScore.moderate,
                  severity: t("severity.moderate").toLowerCase(),
                })}
              </span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span>
                <span className="font-semibold text-ink tabular-nums">{exampleScore.passed}</span>{" "}
                {t("report.passedLabel").toLowerCase()}
              </span>
            </div>
            <p className="mt-3 max-w-[48ch] text-[14px] leading-normal text-body">
              {t(exampleSummary)}
            </p>
            <div className="mt-5 max-w-115 border-t border-hairline pt-4">
              <SectionKicker>{t("priority.kicker")}</SectionKicker>
              <p className="mt-1 mb-2.5 text-[12.5px] leading-normal text-muted">
                {t("priority.note")}
              </p>
              <PriorityList breakdown={breakdown} t={t} />
            </div>
          </div>
          <WcagReading t={t} model={wcag} />
        </div>

        <div className="pb-12" />
      </div>
    </section>
  );
}
