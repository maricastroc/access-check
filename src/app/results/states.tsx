"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faGlobe,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { ScanPhase } from "@/lib/scan/types";

const STEPS: { phase: ScanPhase; label: string }[] = [
  { phase: "preparing", label: "Preparing browser" },
  { phase: "loading", label: "Loading page" },
  { phase: "auditing", label: "Running audit" },
  { phase: "processing", label: "Processing results" },
  { phase: "finalizing", label: "Finalizing report" },
];

export function ScanningState({ url, phase }: { url: string; phase: ScanPhase }) {
  const current = STEPS.findIndex((s) => s.phase === phase);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div>
        <p className="text-lg font-semibold">Auditing the page…</p>
        <p className="mt-1.5 text-sm text-muted">
          Rendering <span className="font-medium text-ink">{url}</span>, injecting axe-core and
          checking 50+ WCAG rules.
        </p>
      </div>

      <ol className="flex w-full max-w-xs flex-col gap-2.5 text-left">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li key={step.phase} className="flex items-center gap-3">
              <span
                className={
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] " +
                  (state === "done"
                    ? "bg-success-surface text-success-fg"
                    : state === "active"
                      ? "bg-brand-50 text-brand-600"
                      : "bg-surface text-faint")
                }
              >
                {state === "done" ? (
                  <FontAwesomeIcon icon={faCheck} aria-hidden />
                ) : state === "active" ? (
                  <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-faint" />
                )}
              </span>
              <span
                className={
                  "text-sm " +
                  (state === "pending"
                    ? "text-faint"
                    : state === "active"
                      ? "font-semibold text-ink"
                      : "text-ink-soft")
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
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
