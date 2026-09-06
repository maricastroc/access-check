"use client";

import Link from "next/link";
import { faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { BrandMark, Button } from "@/components/ui";

function formatWhen(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function TopBar({
  result,
  viewport,
  onRerun,
  onMarkdown,
  busy,
}: {
  result: ScanResult | null;
  viewport: string;
  onRerun: () => void;
  onMarkdown: () => void;
  busy: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-15.5 w-full max-w-[1560px] items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-4">
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5 text-ink">
            <BrandMark size={23} className="self-center" />
            <span className="text-[19px] font-semibold tracking-[-0.01em]">AccessCheck</span>
          </Link>
          {result && (
            <div className="hidden min-w-0 items-baseline gap-3 text-[13px] text-muted lg:flex">
              <span className="truncate font-mono text-ink">{result.finalUrl}</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="whitespace-nowrap">{formatWhen()}</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="whitespace-nowrap tabular-nums">
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className="whitespace-nowrap tabular-nums">{viewport}</span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={faArrowRotateRight}
            onClick={onRerun}
            disabled={busy}
          >
            <span className="hidden sm:inline">Re-audit</span>
          </Button>
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="secondary" size="sm" onClick={onMarkdown} disabled={!result}>
              Export Markdown
            </Button>
            {result ? (
              <Button
                href={`/report?url=${encodeURIComponent(result.finalUrl)}`}
                variant="primary"
                size="sm"
              >
                Export PDF
              </Button>
            ) : (
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-2"
              >
                New audit
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
