import type { Severity } from "@/lib/scan/types";
import { ratioPosition } from "@/lib/report/contrast";
import { severityHatchClass } from "@/lib/report/severity";
import { cn } from "@/lib/cn";

export type RulerProps =
  | {
      variant: "score";
      score: number;
      deductions: { severity: Severity; deduction: number }[];
      height?: number;
      ticks?: boolean;
      label?: string;
    }
  | {
      variant: "ratio";
      found: number;
      required: number;
      fixed?: number | null;
      height?: number;
      label?: string;
    }
  | {
      variant: "progress";
      elapsedMs: number;
      budgetMs: number;
      runningShare?: number;
      label?: string;
    };

function hatchFor(severity: Severity): string {
  return severityHatchClass[severity];
}

export function Ruler(props: RulerProps) {
  if (props.variant === "score") return <ScoreRuler {...props} />;
  if (props.variant === "ratio") return <RatioRuler {...props} />;
  return <ProgressRuler {...props} />;
}

function ScoreRuler({
  score,
  deductions,
  height = 26,
  ticks = false,
  label,
}: Extract<RulerProps, { variant: "score" }>) {
  const clamped = Math.max(0, Math.min(100, score));
  const ariaLabel = label ?? `Internal priority score ${score} out of 100`;

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex w-full overflow-hidden border border-ink bg-surface"
        style={{ height }}
      >
        <span aria-hidden className="h-full bg-ink" style={{ width: `${clamped}%` }} />
        {deductions.map((d) => (
          <span
            key={d.severity}
            aria-hidden
            className={cn(
              "h-full",
              d.severity === "minor" ? "bg-muted" : hatchFor(d.severity),
            )}
            style={{ width: `${d.deduction}%` }}
          />
        ))}
      </div>
      {ticks && <ScoreTicks value={clamped} />}
    </div>
  );
}

function ScoreTicks({ value }: { value: number }) {
  return (
    <div aria-hidden className="relative mt-1 h-3.75 w-full">
      <span className="absolute top-0 left-0 h-1.5 w-px bg-ink" />
      <span className="absolute top-0 left-1/4 h-1 w-px bg-border" />
      <span className="absolute top-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-ink" />
      <span className="absolute top-0 left-3/4 h-1 w-px bg-border" />
      <span className="absolute top-0 right-0 h-1.5 w-px bg-ink" />
      {value > 4 && value < 96 && (
        <span
          className="absolute top-0 h-2.5 w-px -translate-x-1/2 bg-ink"
          style={{ left: `${value}%` }}
        />
      )}

      <span className="absolute top-1.5 left-0 font-cond text-[11px] text-muted">0</span>
      {value > 8 && value < 92 && (
        <span
          className="absolute top-1.5 -translate-x-1/2 font-cond text-[11px] font-medium text-ink tabular-nums"
          style={{ left: `${value}%` }}
        >
          {Math.round(value)}
        </span>
      )}
      <span className="absolute top-1.5 right-0 font-cond text-[11px] text-muted">100</span>
    </div>
  );
}

function RatioRuler({
  found,
  required,
  fixed,
  height = 18,
  label,
}: Extract<RulerProps, { variant: "ratio" }>) {
  const foundPos = ratioPosition(found);
  const requiredPos = ratioPosition(required);
  const fixedPos = fixed != null ? ratioPosition(fixed) : null;
  const ariaLabel =
    label ??
    `Contrast ${found.toFixed(2)} to 1, minimum ${required.toFixed(1)} to 1` +
      (fixed != null ? `, fix reaches ${fixed.toFixed(2)} to 1` : "");

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative w-full overflow-hidden border border-ink bg-surface"
        style={{ height }}
      >
        <span
          aria-hidden
          className="hatch-serious absolute top-0 left-0 h-full"
          style={{ width: `${foundPos}%` }}
        />
        <span
          aria-hidden
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-ink"
          style={{ left: `${requiredPos}%` }}
        />
        {fixedPos != null && (
          <span
            aria-hidden
            className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-verified"
            style={{ left: `${fixedPos}%` }}
          />
        )}
      </div>
      <div aria-hidden className="relative mt-1 h-6.5 w-full font-cond text-[10.5px]">
        <span className="absolute top-0 left-0 text-muted">1:1</span>
        <span className="absolute top-0 right-0 text-muted">7:1</span>
        <span
          className="absolute top-0 -translate-x-1/2 font-medium text-ink tabular-nums"
          style={{ left: `${requiredPos}%` }}
        >
          {required.toFixed(1)} min AA
        </span>
        {fixedPos != null && fixed != null && (
          <span
            className="absolute top-3.25 -translate-x-1/2 font-medium text-verified tabular-nums"
            style={{ left: `${fixedPos}%` }}
          >
            {fixed.toFixed(2)} fixed
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressRuler({
  elapsedMs,
  budgetMs,
  runningShare = 0.06,
  label,
}: Extract<RulerProps, { variant: "progress" }>) {
  const done = budgetMs > 0 ? Math.max(0, Math.min(1, elapsedMs / budgetMs)) : 0;
  const donePct = done * 100;
  const runningPct = Math.min(100 - donePct, runningShare * 100);
  const secs = (elapsedMs / 1000).toFixed(1);
  const budgetSecs = Math.round(budgetMs / 1000);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={budgetMs}
      aria-valuenow={elapsedMs}
      aria-label={label ?? `Audit progress: ${secs}s of up to ${budgetSecs}s`}
      className="flex h-3.5 w-full overflow-hidden border border-ink bg-surface"
    >
      <span aria-hidden className="h-full bg-ink" style={{ width: `${donePct}%` }} />
      <span aria-hidden className="hatch-progress-live h-full" style={{ width: `${runningPct}%` }} />
    </div>
  );
}
