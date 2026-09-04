"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPrint, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/ui";
import type { Status } from "./shared";

export function Toolbar({ url, status }: { url: string; status: Status }) {
  return (
    <header className="ac-toolbar sticky top-0 z-30 flex h-[58px] items-center justify-between gap-2 border-b border-border bg-surface px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <Logo />
        <span className="hidden h-5 w-px bg-border sm:block" />
        <Link
          href={`/results?url=${encodeURIComponent(url)}`}
          className="flex h-9 items-center gap-2 px-2 text-[13px] font-medium text-steel transition-colors hover:underline"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span className="hidden sm:inline">Back to results</span>
        </Link>
      </div>
      <button
        onClick={() => window.print()}
        disabled={status !== "done"}
        className="flex h-9 shrink-0 cursor-pointer items-center gap-2 bg-ink px-4 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2 disabled:cursor-default disabled:bg-canvas disabled:text-disabled"
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
  tone = "steel",
  title,
  subtitle,
  progress,
  action,
}: {
  icon: typeof faSpinner;
  spin?: boolean;
  tone?: "steel" | "critical";
  title: string;
  subtitle: string;
  progress?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      aria-live={tone === "critical" ? undefined : "polite"}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <span
        className={`flex size-12 items-center justify-center ${
          tone === "critical"
            ? "bg-critical text-surface"
            : "border border-border bg-surface text-steel"
        }`}
      >
        <FontAwesomeIcon
          icon={icon}
          aria-hidden
          className={`text-lg ${spin ? "animate-spin" : ""}`}
        />
      </span>
      <div className="max-w-md">
        <p className="text-[17px] font-semibold text-ink">{title}</p>
        <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>
      </div>
      {progress && (
        <div
          role="progressbar"
          aria-label="Building report"
          className="relative mt-1 h-2 w-full max-w-64 overflow-hidden border border-ink bg-surface"
        >
          <span className="hatch-progress-live absolute inset-y-0 left-0 w-2/5" />
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
          border: 0 !important;
          break-after: page;
        }
        .ac-page:last-child { break-after: auto; }
      }
    `}</style>
  );
}
