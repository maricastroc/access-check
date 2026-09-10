import type { ScoreBreakdown } from "@/lib/report/score";
import { severityHatchClass, severityLabel } from "@/lib/report/severity";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

export function ScoreArithmetic({
  breakdown,
  passed,
  manualReview,
  t,
}: {
  breakdown: ScoreBreakdown;
  passed: number;
  manualReview: number;
  t: Translate;
}) {
  const { score, deductions } = breakdown;
  return (
    <div className="text-[13px]">
      <div className="flex items-center gap-2.5 text-body">
        <span aria-hidden className="h-3 w-3 shrink-0 bg-ink" />
        <span>{t("score.checksPassed", { count: passed })}</span>
        <span className="ml-auto font-mono text-[13px] font-semibold text-ink tabular-nums">
          {score}
          <span className="text-muted"> / 100</span>
        </span>
      </div>

      {deductions.length > 0 && (
        <div className="mt-2.5 border-t border-hairline pt-2.5">
          <p className="font-cond text-[11px] tracking-widest text-muted uppercase">
            {t("score.ifYouFix")}
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
                  {t("results.findingsAndElements", {
                    findings: `${d.issues} ${severityLabel(d.severity, t).toLowerCase()}`,
                    elements: t("unit.element", { count: d.elements }),
                  })}
                </span>
                <span className="ml-auto flex items-baseline gap-1.5">
                  <span className="font-mono text-[13px] font-semibold text-ink tabular-nums">
                    {d.ifFixed}
                  </span>
                  <span className="font-cond text-[11px] text-verified tabular-nums">
                    +{d.gain}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2.5 border-t border-hairline pt-2.5 text-[11.5px] leading-normal text-muted">
        {t("md.manualOutside", { count: manualReview })}
        {deductions.length > 1 ? ` ${t("score.nonLinearNote")}` : ""}
      </p>
    </div>
  );
}
