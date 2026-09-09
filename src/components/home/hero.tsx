import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { Ruler, ScoreArithmetic, SectionKicker, WcagReading } from "@/components/ui";
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
            <div className="mt-1 flex items-end gap-2">
              <span className="font-cond text-[64px] leading-[0.85] text-ink tabular-nums">
                {exampleScore.score}
              </span>
              <span className="pb-2 font-cond text-[18px] text-muted">/100</span>
            </div>
            <p className="mt-2.5 max-w-[48ch] text-[14px] leading-normal text-body">
              {t(exampleSummary)}
            </p>
            <div className="mt-3 max-w-130">
              <Ruler
                t={t}
                variant="score"
                score={exampleScore.score}
                deductions={breakdown.deductions}
                height={30}
                ticks
              />
            </div>
            <div className="mt-5 max-w-115">
              <ScoreArithmetic
                t={t}
                breakdown={breakdown}
                passed={exampleScore.passed}
                manualReview={exampleScore.manualReview}
              />
            </div>
          </div>
          <WcagReading t={t} model={wcag} />
        </div>

        <div className="pb-12" />
      </div>
    </section>
  );
}
