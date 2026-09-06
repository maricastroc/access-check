"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { faArrowLeft, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { BrandMark, Button } from "@/components/ui";

const MINUTE = 60_000;

function describeWhen(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";

  const ago = Date.now() - at;
  if (ago < MINUTE) return "Audited just now";
  if (ago < 60 * MINUTE) return `Audited ${Math.round(ago / MINUTE)} min ago`;

  return `Audited ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at)}`;
}

function subscribeToMinute(onChange: () => void): () => void {
  const timer = setInterval(onChange, MINUTE);
  return () => clearInterval(timer);
}

function AuditTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribeToMinute,
    () => describeWhen(iso),
    () => "",
  );

  if (!label) return null;
  return (
    <>
      <Dot />
      <time dateTime={iso} className="whitespace-nowrap">
        {label}
      </time>
    </>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-border">
      ·
    </span>
  );
}

export function TopBar({
  result,
  viewport,
  siteId,
  onRerun,
  onMarkdown,
  busy,
}: {
  result: ScanResult | null;
  viewport: string;
  siteId: string | null;
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
          {siteId && (
            <Button
              href={`/site/${siteId}`}
              variant="secondary"
              size="sm"
              icon={faArrowLeft}
              aria-label="Back to site audit"
              className="shrink-0 self-center"
            >
              <span className="hidden sm:inline">Site audit</span>
            </Button>
          )}
          {result && (
            <div className="hidden min-w-0 items-baseline gap-3 text-[13px] text-muted lg:flex">
              <span className="truncate font-mono text-ink">{result.finalUrl}</span>
              {result.scannedAt && <AuditTime iso={result.scannedAt} />}
              <Dot />
              <span className="whitespace-nowrap tabular-nums">
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
              <Dot />
              <span className="whitespace-nowrap tabular-nums">{viewport}</span>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={faArrowRotateRight}
            aria-label="Re-audit this page"
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
