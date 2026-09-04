import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { Ruler, ScoreArithmetic, SectionKicker, WcagReading } from "@/components/ui";
import { UrlForm } from "./url-form";
import { HeroEvidencePreview } from "./evidence-preview";
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
    <section className="border-b border-hairline bg-gradient-to-b from-band via-canvas to-canvas">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        {/* first fold: message + form (left), live inspector (right) */}
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 pt-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-x-20 lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <SectionKicker tone="steel">
                axe-core · WCAG 2.0 / 2.1 / 2.2 · levels A and AA
              </SectionKicker>
              <span aria-hidden className="h-4 w-px bg-hairline" />
              <span className="text-[13px] text-muted">+ keyboard, viewport and vision passes</span>
            </div>
            <h1 className="mt-5 font-sans text-[42px] leading-[1.05] font-semibold tracking-[-0.025em] text-ink">
              Every barrier measured, located on the element, and tested before it&apos;s suggested.
            </h1>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.5] text-body">
              This is not another report. It is a visual inspector: paste a web address and every
              finding comes tied to the element that caused it, with the contrast ratio, the selector
              and a fix we test on a copy of the page.
            </p>
            <div className="mt-6">
              <UrlForm examples={["wikipedia.org", "stripe.com", "github.com"]} />
            </div>
            <p className="mt-4 flex items-start gap-2.5 border-l-[3px] border-steel bg-steel/[0.06] px-3 py-2 text-[13px] text-body">
              <SectionKicker tone="steel" className="mt-px shrink-0">
                Not
              </SectionKicker>
              a conformance seal. It measures what automated tools can prove, and marks the rest for a
              human to review.
            </p>
          </div>

          <div className="lg:pt-1">
            <HeroEvidencePreview />
            <p className="mt-2.5 text-[12.5px] text-muted">
              Select a finding and its marker lights up. Click the marker and the details open: the
              screenshot, the measurement and the code in one place.
            </p>
          </div>
        </div>

        {/* ruler band — last public audit */}
        <div className="mt-12 grid grid-cols-1 gap-12 border border-border bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <span aria-hidden className="mb-2.5 block h-[3px] w-10 bg-steel" />
            <SectionKicker>Most recent public audit · internal priority score</SectionKicker>
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

        <div className="pb-12" />
      </div>
    </section>
  );
}
