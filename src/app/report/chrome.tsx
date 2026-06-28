"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPrint, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { Status } from "./shared";

export function Toolbar({ url, status }: { url: string; status: Status }) {
  return (
    <header className="ac-toolbar sticky top-0 z-30 flex h-14.5 items-center justify-between gap-2 border-b border-line bg-card px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3.5">
        <Link
          href={`/results?url=${encodeURIComponent(url)}`}
          className="flex h-8.5 items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span className="hidden sm:inline">Back to results</span>
        </Link>
        <span className="hidden h-5 w-px bg-line-strong sm:block" />
        <span className="hidden text-[13px] font-medium sm:inline">Exportable report</span>
      </div>
      <button
        onClick={() => window.print()}
        disabled={status !== "done"}
        className="flex h-8.5 shrink-0 cursor-pointer items-center gap-2 rounded-[9px] bg-brand-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faPrint} className="text-xs" />
        <span className="hidden sm:inline">Print / Save as PDF</span>
        <span className="sm:hidden">Save PDF</span>
      </button>
    </header>
  );
}

export function CenterState({
  icon,
  spin,
  tone = "brand",
  title,
  subtitle,
  progress,
  action,
}: {
  icon: typeof faSpinner;
  spin?: boolean;
  tone?: "brand" | "critical";
  title: string;
  subtitle: string;
  progress?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-2xl ${
          tone === "critical" ? "bg-[#fdecec] text-critical" : "bg-brand-50 text-brand-500"
        }`}
      >
        <FontAwesomeIcon icon={icon} className={`text-xl ${spin ? "animate-spin" : ""}`} />
      </span>
      <div className="max-w-md">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </div>
      {progress && (
        <div
          role="progressbar"
          aria-label="Running accessibility audit"
          className="relative mt-1 h-1 w-full max-w-65 overflow-hidden rounded-full bg-line"
        >
          <span className="ac-indeterminate" />
        </div>
      )}
      {action}
    </div>
  );
}

export function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: letter; margin: 0; }
        body { background: #fff !important; }
        .ac-toolbar { display: none !important; }
        .ac-canvas { background: #fff !important; }
        .ac-page {
          box-shadow: none !important;
          border-radius: 0 !important;
          break-after: page;
        }
        .ac-page:last-child { break-after: auto; }
      }
    `}</style>
  );
}
