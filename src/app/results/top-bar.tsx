"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import type { Status } from "./shared";

export function TopBar({
  status,
  onRerun,
  busy,
}: {
  status: Status;
  onRerun: () => void;
  busy: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14.5 items-center justify-between border-b border-line bg-card px-7">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-5.5 items-center justify-center rounded-md bg-ink">
          <span className="size-2.25 rotate-45 rounded-xs bg-brand-500" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">AccessCheck</span>
        <span className="ml-0.5 border-l border-line-strong pl-2.5 font-mono text-[11px] text-muted">
          v2.1 · WCAG 2.1
        </span>
      </Link>
      <div className="flex items-center gap-3.5">
        <Link
          href="/"
          className="flex h-8.5 items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          New scan
        </Link>
        <span className="h-5 w-px bg-line-strong" />
        <div className="flex items-center gap-1.75 text-[12.5px] text-ink-soft">
          <span
            className={`size-1.75 rounded-full ${
              status === "done"
                ? "bg-success shadow-[0_0_0_3px_rgba(31,157,107,.14)]"
                : status === "error"
                  ? "bg-critical"
                  : "animate-pulse bg-serious"
            }`}
          />
          {status === "done"
            ? "Analysis complete"
            : status === "error"
              ? "Analysis failed"
              : "Analyzing…"}
        </div>
        <button
          onClick={onRerun}
          disabled={busy}
          className="flex h-8.5 items-center gap-2 rounded-[9px] border border-line-strong bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={faArrowRotateRight}
            className={`text-xs ${busy ? "animate-spin" : ""}`}
          />
          Re-run analysis
        </button>
        <span className="flex size-7.5 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-300 text-xs font-semibold text-white">
          QA
        </span>
      </div>
    </header>
  );
}
