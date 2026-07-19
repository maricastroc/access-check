"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faGlobe,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase } from "@/lib/scan/types";

type StepState = "done" | "active" | "pending";

const STEPS: { phase: ScanPhase; label: string; detail: string }[] = [
  {
    phase: "preparing",
    label: "Preparing browser",
    detail: "Launching a headless Chromium instance.",
  },
  { phase: "loading", label: "Loading page", detail: "Fetching and rendering the full DOM." },
  {
    phase: "auditing",
    label: "Running audit",
    detail: "Injecting axe-core and evaluating 50+ WCAG success criteria.",
  },
  {
    phase: "processing",
    label: "Processing results",
    detail: "Verifying each fix live in the page and mapping the issues.",
  },
  { phase: "finalizing", label: "Finalizing report", detail: "Scoring and assembling the report." },
];

function StepNode({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft">
        <FontAwesomeIcon icon={faCheck} aria-hidden className="text-[11px]" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="ac-node-ring absolute inline-flex size-7 rounded-full bg-brand-400"
        />
        <span className="relative flex size-7 items-center justify-center rounded-full bg-brand-600 text-white ring-4 ring-brand-100">
          <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin text-[11px]" />
        </span>
      </span>
    );
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-chip text-[12px] font-semibold text-muted tabular-nums">
      {index + 1}
    </span>
  );
}

export function ScanningState({ url, phase }: { url: string; phase: ScanPhase }) {
  const found = STEPS.findIndex((s) => s.phase === phase);
  const current = found === -1 ? 0 : found;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-10">
      <p className="sr-only" role="status" aria-live="polite">
        Step {current + 1} of {STEPS.length}: {STEPS[current].label}. {STEPS[current].detail}
      </p>

      <section
        aria-label="Scan progress"
        className="ac-scan w-full max-w-140 rounded-card border border-line-strong bg-card p-7 shadow-card sm:p-9"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">
            <span className="relative flex size-1.5">
              <span
                aria-hidden
                className="ac-node-ring absolute inline-flex size-1.5 rounded-full bg-brand-500"
              />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand-600" />
            </span>
            Auditing
          </span>
          <span className="font-mono text-xs tabular-nums text-muted" aria-hidden>
            {mmss}
          </span>
        </div>

        <h1 className="mt-4 text-[22px] leading-tight font-bold tracking-tight text-ink">
          Running accessibility audit
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          We drive a real browser through the page — not just a static parse of the HTML.
        </p>

        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2.5">
          <FontAwesomeIcon icon={faGlobe} aria-hidden className="shrink-0 text-[13px] text-brand-600" />
          <span className="truncate font-mono text-[13px] text-ink-soft">{url}</span>
        </div>

        <ol className="mt-6 flex flex-col">
          {STEPS.map((step, i) => {
            const state: StepState = i < current ? "done" : i === current ? "active" : "pending";
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.phase} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <StepNode state={state} index={i} />
                  {!isLast && (
                    <span
                      aria-hidden
                      className={`w-px flex-1 ${i < current ? "bg-brand-500" : "bg-line-strong"}`}
                    />
                  )}
                </div>

                <div className={isLast ? "pb-0" : "pb-4"}>
                  <p
                    className={
                      state === "active"
                        ? "text-[15px] leading-7 font-semibold text-ink"
                        : state === "done"
                          ? "text-sm leading-7 font-medium text-ink-soft"
                          : "text-sm leading-7 font-medium text-muted"
                    }
                  >
                    {step.label}
                  </p>
                  {state === "active" && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{step.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export function ErrorState({
  url,
  message,
  onChange,
  onRetry,
}: {
  url: string;
  message: string;
  onChange: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[#fdecec] text-critical">
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden className="text-xl" />
      </span>
      <div className="max-w-md">
        <p className="text-lg font-semibold">Couldn’t scan that page</p>
        <p className="mt-1.5 text-sm text-muted">{message}</p>
        <p className="mt-1 text-xs text-faint">
          Some sites block bots or sit behind a login — try another URL.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRetry();
        }}
        className="flex w-full max-w-md items-center gap-2 rounded-field border border-line bg-card p-2 shadow-soft"
      >
        <FontAwesomeIcon icon={faGlobe} aria-hidden className="ml-2 text-sm text-muted" />
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Website URL to retry"
          className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
          placeholder="example.com"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-[9px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
      </form>
    </div>
  );
}
