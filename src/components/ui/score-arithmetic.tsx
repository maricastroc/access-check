import type { ScoreBreakdown } from "@/lib/report/score";
import { severityHatchClass, severityLabel } from "@/lib/report/severity";
import { cn } from "@/lib/cn";

/**
 * The arithmetic behind the internal priority score: base 100, a deduction per
 * severity (weighted, saturating with element count in the engine), and the
 * total. Manual-review items are shown as coverage, explicitly outside the score.
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
  return (
    <div className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-x-3 gap-y-2 text-[13px]">
      <span aria-hidden className="h-3 w-3 bg-ink" />
      <span className="text-body">{passed} automated checks passed</span>
      <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">base</span>
      <span className="font-mono text-[12.5px] tabular-nums text-ink">100</span>

      {breakdown.deductions.map((d) => (
        <div key={d.severity} className="contents">
          <span
            aria-hidden
            className={cn("h-3 w-3", d.severity === "minor" ? "bg-muted" : severityHatchClass[d.severity])}
          />
          <span className="text-body">
            {d.issues} {severityLabel[d.severity].toLowerCase()} · {d.elements} element
            {d.elements === 1 ? "" : "s"}
          </span>
          <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
            {severityLabel[d.severity]}
          </span>
          <span className="font-mono text-[12.5px] tabular-nums text-ink">−{d.deduction}</span>
        </div>
      ))}

      <span aria-hidden className="h-3 w-3 border border-dashed border-border" />
      <span className="text-muted">
        {manualReview} manual-review item{manualReview === 1 ? "" : "s"}
      </span>
      <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
        outside score
      </span>
      <span className="text-muted">—</span>

      <span aria-hidden className="h-3 w-3" />
      <span className="border-t border-hairline pt-2 font-medium text-ink">Internal priority score</span>
      <span className="border-t border-hairline pt-2 font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
        score
      </span>
      <span className="border-t border-hairline pt-2 font-mono text-[13px] font-semibold tabular-nums text-ink">
        {breakdown.score}
      </span>
    </div>
  );
}
