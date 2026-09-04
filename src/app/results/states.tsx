"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase, ScanWarning } from "@/lib/scan/types";
import { Button, Ruler, ScanStages, WarningList } from "@/components/ui";
import { UrlField } from "@/components/home/url-form";

const BUDGET_MS = 25_000;

const PHASE_LABEL: Record<ScanPhase, string> = {
  preparing: "getting ready",
  loading: "opening the page",
  auditing: "running the checks",
  processing: "processing the results",
  finalizing: "finishing up",
};

export function ScanningState({ url, phase }: { url: string; phase: ScanPhase }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 100);
    return () => clearInterval(id);
  }, []);

  const secs = (elapsed / 1000).toFixed(1);
  const budget = Math.round(BUDGET_MS / 1000);

  return (
    <div className="mx-auto w-full max-w-160 px-4 py-16">
      <div className="border border-border bg-surface p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-cond text-[28px] leading-none text-ink tabular-nums">{secs}s</span>
          <span className="text-[13px] text-muted">of up to {budget}s</span>
          <span className="ml-auto truncate font-mono text-[12.5px] text-muted">{url}</span>
        </div>
        <div className="mt-3">
          <Ruler variant="progress" elapsedMs={elapsed} budgetMs={BUDGET_MS} />
        </div>
        <div className="mt-4">
          <ScanStages phase={phase} />
        </div>
        <p className="mt-3 text-[12.5px] text-muted">
          These are the real steps AccessCheck runs, in the order they happen.
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          Auditing {url}. Currently {PHASE_LABEL[phase]}.
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  url,
  message,
  hint,
  onChange,
  onRetry,
}: {
  url: string;
  message: string;
  hint?: string;
  onChange: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-140 px-4 py-16">
      <div role="alert" className="border border-critical bg-surface p-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 items-center justify-center bg-critical text-surface"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </span>
          <h2 className="text-[16px] font-semibold text-ink">Couldn&apos;t open the page</h2>
        </div>
        <p className="mt-3 text-[14px] leading-normal text-body">{message}</p>
        {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRetry();
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <UrlField value={url} onChange={onChange} onSubmit={onRetry} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="md">
              Try another URL
            </Button>
            <Button href="/" variant="tertiary">
              See what we can audit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PartialNotice({
  warnings,
  onRerun,
}: {
  warnings: ScanWarning[];
  onRerun: () => void;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 pt-4 sm:px-6">
      <WarningList
        warnings={warnings}
        title="Partial report"
        note="The score reflects only what we could measure. Anything we skipped is listed below, not guessed."
      />
      <div className="mt-2">
        <Button variant="secondary" size="sm" onClick={onRerun}>
          Run again with more time
        </Button>
      </div>
    </div>
  );
}
