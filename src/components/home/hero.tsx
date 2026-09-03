import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { Ruler, ScoreArithmetic, SectionKicker, WcagReading } from "@/components/ui";
import { UrlForm } from "./url-form";
import { exampleScore } from "./content";

const breakdown: ScoreBreakdown = {
  base: 100,
  score: exampleScore.score,
  totalDeduction: 100 - exampleScore.score,
  deductions: exampleScore.deductions,
};

const wcag: WcagReadingModel = {
  a: { fails: false, criteria: [] },
  aa: { fails: true, criteria: [{ sc: "1.4.3", name: "Contrast (Minimum)" }] },
  aaa: { evaluated: false },
};

export function Hero() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        {/* message */}
        <div className="grid grid-cols-1 gap-10 pt-14 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="max-w-[660px]">
            <div className="flex flex-wrap items-center gap-3">
              <SectionKicker tone="steel">
                axe-core · WCAG 2.0 / 2.1 / 2.2 · levels A and AA
              </SectionKicker>
              <span aria-hidden className="h-4 w-px bg-hairline" />
              <span className="text-[13px] text-muted">
                + keyboard, mobile viewport and expanded-UI passes
              </span>
            </div>
            <h1 className="mt-5 font-sans text-[46px] leading-[1.04] font-semibold tracking-[-0.025em] text-ink">
              Every barrier measured, located on the element, and with the fix already tested.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[18px] leading-[1.55] text-body">
              Paste a URL. We open the page in a real browser, measure what can be measured, and
              return each finding tied to the element that caused it — with the ratio, the selector
              and a fix applied and re-audited in a sandbox copy.
            </p>
          </div>
          <div className="border-l border-hairline pl-6">
            <SectionKicker>What this isn&apos;t</SectionKicker>
            <p className="mt-2 text-[14px] leading-normal text-body">
              Not a conformance seal. It measures what automated tooling can prove, with the rest
              declared as manual review.
            </p>
          </div>
        </div>

        {/* url field */}
        <div className="pt-8">
          <UrlForm />
        </div>

        {/* ruler band */}
        <div className="mt-11 grid grid-cols-1 gap-12 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <SectionKicker>Last public audit · AccessCheck internal score</SectionKicker>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-cond text-[64px] leading-[0.85] tabular-nums text-ink">
                {exampleScore.score}
              </span>
              <span className="pb-2 font-cond text-[18px] text-muted">/100</span>
            </div>
            <div className="mt-3 max-w-[520px]">
              <Ruler variant="score" score={exampleScore.score} deductions={breakdown.deductions} height={30} ticks />
            </div>
            <div className="mt-5 max-w-[460px]">
              <ScoreArithmetic
                breakdown={breakdown}
                passed={exampleScore.passed}
                manualReview={exampleScore.manualReview}
              />
            </div>
          </div>
          <WcagReading model={wcag} />
        </div>

        <div className="pb-14" />
      </div>
    </section>
  );
}
