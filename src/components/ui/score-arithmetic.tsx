import type { ScoreBreakdown } from "@/lib/report/score";
import { severityHatchClass, severityLabel } from "@/lib/report/severity";
import { cn } from "@/lib/cn";

/**
 * The internal priority score, explained in terms of what fixing each severity
 * would actually recover. The score is non-linear (see score.ts), so we never
 * show it as a running subtraction. Each severity line reports the score the page
 * would reach if that severity were fixed on its own; manual-review items are
 * shown as coverage, explicitly outside the score.
 */
export function ScoreArithmetic({
  breakdown,
  passed,
  manualReview,
}: {
  breakdown: ScoreBreakdown;
  passed: number;
  manualReview: number;
}) {
  const { score, deductions } = breakdown;
  return (
    <div className="text-[13px]">
      <div className="flex items-center gap-2.5 text-body">
        <span aria-hidden className="h-3 w-3 shrink-0 bg-ink" />
        <span>{passed} automated checks passed</span>
        <span className="ml-auto font-mono text-[13px] font-semibold tabular-nums text-ink">
          {score}
          <span className="text-muted"> / 100</span>
        </span>
      </div>

      {deductions.length > 0 && (
        <div className="mt-2.5 border-t border-hairline pt-2.5">
          <p className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
            If you fix these, the score rises to
          </p>
          <div className="mt-2 space-y-1.5">
            {deductions.map((d) => (
              <div key={d.severity} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-3 w-3 shrink-0",
                    d.severity === "minor" ? "bg-muted" : severityHatchClass[d.severity],
                  )}
                />
                <span className="text-body">
                  {d.issues} {severityLabel[d.severity].toLowerCase()} · {d.elements} element
                  {d.elements === 1 ? "" : "s"}
                </span>
                <span className="ml-auto flex items-baseline gap-1.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                    {d.ifFixed}
                  </span>
                  <span className="font-cond text-[11px] text-verified tabular-nums">+{d.gain}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2.5 border-t border-hairline pt-2.5 text-[11.5px] leading-normal text-muted">
        {manualReview} manual-review item{manualReview === 1 ? "" : "s"} sit outside the score.
        {deductions.length > 1
          ? " Each line is the score after fixing that severity on its own. The score is non-linear, so fixing more than one recovers less than the lines added together."
          : ""}
      </p>
    </div>
  );
}
