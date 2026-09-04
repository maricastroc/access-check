import type { ScanResult } from "@/lib/scan/types";
import type { ScoreBreakdown } from "@/lib/report/score";
import type { WcagReadingModel } from "@/lib/report/wcag";
import { severityLabel, severityTextVar } from "@/lib/report/severity";
import { Ruler, SectionKicker, WcagChips } from "@/components/ui";

export function SummaryBand({
  result,
  breakdown,
  wcag,
}: {
  result: ScanResult;
  breakdown: ScoreBreakdown;
  wcag: WcagReadingModel;
}) {
  const { counts } = result;
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-x-8 gap-y-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <SectionKicker>Internal priority score</SectionKicker>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-cond text-[56px] leading-[0.85] tabular-nums text-ink">
              {result.score}
            </span>
            <span className="pb-1.5 font-cond text-[18px] text-muted">/100</span>
          </div>
          <div className="mt-3 max-w-[560px]">
            <Ruler variant="score" score={result.score} deductions={breakdown.deductions} height={26} ticks />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-body">
            <span>
              <span className="font-semibold text-ink tabular-nums">{counts.passed}</span> passed
            </span>
            {breakdown.deductions.map((d) => (
              <span key={d.severity} className="flex items-center gap-1.5">
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span className="font-medium" style={{ color: severityTextVar[d.severity] }}>
                  {d.issues} {severityLabel[d.severity].toLowerCase()}
                </span>
                <span className="text-muted tabular-nums">
                  · {d.elements} element{d.elements === 1 ? "" : "s"} · −{d.deduction}
                </span>
              </span>
            ))}
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="text-muted tabular-nums">
              {counts.manualReview} manual-review item{counts.manualReview === 1 ? "" : "s"} · outside
              the score
            </span>
          </div>
        </div>

        <div className="border-t border-hairline pt-5 lg:border-t-0 lg:border-l lg:border-border lg:pt-0 lg:pl-8">
          <p className="text-[15px] leading-normal text-body">{result.summary}</p>
          <div className="mt-4">
            <WcagChips model={wcag} />
          </div>
        </div>
      </div>
    </section>
  );
}
