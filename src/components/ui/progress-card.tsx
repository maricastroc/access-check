"use client";

import { useEffect, useState } from "react";
import { Ruler } from "./ruler";

export function useElapsed(tickMs = 100): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return elapsed;
}

export function ProgressCard({
  target,
  elapsedMs,
  budgetMs,
  progressLabel,
  note,
  status,
  children,
}: {
  target: string;
  elapsedMs: number;
  budgetMs: number;
  progressLabel?: string;
  note: string;
  status: string;
  children: React.ReactNode;
}) {
  const secs = (elapsedMs / 1000).toFixed(1);
  const budget = Math.round(budgetMs / 1000);

  return (
    <div className="mx-auto w-full max-w-160">
      <div className="border border-border bg-surface p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-cond text-[28px] leading-none text-ink tabular-nums">{secs}s</span>
          <span className="text-[13px] text-muted">of up to {budget}s</span>
          <span className="ml-auto truncate font-mono text-[12.5px] text-muted">{target}</span>
        </div>
        <div className="mt-3">
          <Ruler
            variant="progress"
            elapsedMs={elapsedMs}
            budgetMs={budgetMs}
            label={progressLabel}
          />
        </div>
        <div className="mt-4">{children}</div>
        <p className="mt-3 text-[12.5px] text-muted">{note}</p>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
