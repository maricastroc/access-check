"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { Severity } from "@/lib/scan/types";
import { SEVERITY_ORDER, severityColorVar, severityLabel } from "@/lib/report/severity";
import { Ruler, SectionKicker, StatusPill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { crawlHost, pagePath, type CrawlPage, type CrawlSnapshot } from "../shared";

function scoreTone(score: number): string {
  if (score >= 90) return "bg-verified";
  if (score >= 70) return "bg-moderate";
  return "bg-critical";
}

export function ProgressHeader({ snap }: { snap: CrawlSnapshot }) {
  const running = snap.status === "running";
  const settled = snap.scannedPages + snap.failedPages;

  return (
    <section className="border-b border-border pb-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <SectionKicker as="div">Full-site accessibility audit</SectionKicker>
          <h1 className="mt-1 truncate font-cond text-[38px] leading-none text-ink sm:text-[46px]">
            {crawlHost(snap.rootUrl)}
          </h1>
        </div>
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
          {running && <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin" />}
          <span className="tabular-nums">
            {running
              ? `Auditing ${settled} of ${snap.totalPages}`
              : snap.status === "failed"
                ? "Audit failed"
                : `Done · ${snap.totalPages} page${snap.totalPages === 1 ? "" : "s"}`}
          </span>
        </p>
      </div>

      {running && (
        <div className="mt-4">
          <Ruler
            variant="steps"
            done={settled}
            total={snap.totalPages}
            runningShare={0.06}
            label={`Site audit progress: ${settled} of ${snap.totalPages} pages audited`}
          />
        </div>
      )}

      {snap.status === "failed" && snap.error && (
        <div role="alert" className="mt-4 border border-critical bg-surface p-4">
          <p className="text-[13.5px] leading-normal text-body">{snap.error}</p>
        </div>
      )}
    </section>
  );
}

export function SiteSummary({ snap, score }: { snap: CrawlSnapshot; score: number | null }) {
  const done = snap.pages.filter((p) => p.status === "done");
  const found = SEVERITY_ORDER.map((severity) => ({
    severity,
    value: done.reduce((sum, p) => sum + p.counts[severity], 0),
  })).filter((t) => t.value > 0);

  return (
    <section className="mt-6 border border-border bg-surface p-5 sm:p-6">
      <SectionKicker>Site score</SectionKicker>
      <div className="mt-1 flex items-end gap-2">
        <span className="font-cond text-[56px] leading-[0.85] text-ink tabular-nums">
          {score ?? "—"}
        </span>
        <span className="pb-1.5 font-cond text-[18px] text-muted">/100</span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        {snap.status === "running"
          ? "running average across audited pages"
          : "average across all audited pages"}
      </p>

      <div className="mt-3 max-w-[560px]">
        <Ruler
          variant="score"
          score={score ?? 0}
          deductions={[]}
          height={26}
          ticks
          label={`Site score ${score ?? 0} out of 100`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-body">
        <span>
          <span className="font-semibold text-ink tabular-nums">{done.length}</span> page
          {done.length === 1 ? "" : "s"} audited
        </span>
        {found.length === 0 && done.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-border">
              ·
            </span>
            <StatusPill tone="verified">No automated findings</StatusPill>
          </span>
        )}
        {found.map((t) => (
          <span key={t.severity} className="flex items-center gap-1.5">
            <span aria-hidden className="text-border">
              ·
            </span>
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0", t.severity === "minor" && "bg-muted")}
              style={
                t.severity === "minor" ? undefined : { background: severityColorVar[t.severity] }
              }
            />
            <span className="tabular-nums">
              <span className="font-semibold text-ink">{t.value}</span>{" "}
              {severityLabel[t.severity].toLowerCase()}
            </span>
          </span>
        ))}
        {snap.failedPages > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="text-border">
              ·
            </span>
            <StatusPill tone="critical">
              {snap.failedPages} page{snap.failedPages === 1 ? "" : "s"} failed
            </StatusPill>
          </span>
        )}
      </div>
    </section>
  );
}

function StatusSquare({ page }: { page: CrawlPage }) {
  if (page.status === "done" && page.score !== null) {
    return (
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center font-cond text-[16px] font-semibold text-surface tabular-nums",
          scoreTone(page.score),
        )}
        aria-label={`Score ${page.score} out of 100`}
      >
        {page.score}
      </span>
    );
  }
  if (page.status === "failed") {
    return (
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center bg-critical text-surface"
      >
        <FontAwesomeIcon icon={faXmark} className="text-xs" />
      </span>
    );
  }
  if (page.status === "running") {
    return (
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center border border-border bg-surface text-ink"
      >
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center border border-hairline bg-surface font-cond text-disabled"
    >
      ·
    </span>
  );
}

function SeverityCounts({ counts }: { counts: Record<Severity, number> }) {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + counts[s], 0);

  if (total === 0) return <StatusPill tone="verified">No findings</StatusPill>;

  return (
    <span className="flex items-center gap-3 text-[13px] text-body">
      {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
        <span key={s} className="flex items-center gap-1.5" title={severityLabel[s]}>
          <span
            aria-hidden
            className={cn("size-2.5 shrink-0", s === "minor" && "bg-muted")}
            style={s === "minor" ? undefined : { background: severityColorVar[s] }}
          />
          <span className="tabular-nums">{counts[s]}</span>
          <span className="sr-only">{severityLabel[s]}</span>
        </span>
      ))}
    </span>
  );
}

export function PageRow({ page, siteId }: { page: CrawlPage; siteId: string }) {
  const done = page.status === "done";

  const secondary =
    page.status === "failed"
      ? page.error || "This page could not be audited."
      : page.status === "pending"
        ? "Waiting…"
        : page.status === "running"
          ? "Auditing…"
          : page.title || page.url;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3.5 border px-4 py-3 transition-colors",
        done
          ? "border-border bg-surface group-hover:bg-band"
          : page.status === "failed"
            ? "border-border bg-surface"
            : "border-hairline bg-surface",
      )}
    >
      <StatusSquare page={page} />

      <div className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[13px] font-medium text-ink">
          {pagePath(page.url)}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[12.5px]",
            page.status === "failed" ? "text-critical" : "text-muted",
          )}
        >
          {secondary}
        </span>
      </div>

      {done && (
        <div className="shrink-0">
          <SeverityCounts counts={page.counts} />
        </div>
      )}

      {done && (
        <FontAwesomeIcon
          icon={faArrowRight}
          aria-hidden
          className="shrink-0 text-xs text-muted transition-colors group-hover:text-ink"
        />
      )}
    </div>
  );

  if (!done) return <li>{inner}</li>;

  return (
    <li className="group">
      <Link
        href={`/results?url=${encodeURIComponent(page.url)}&site=${siteId}`}
        aria-label={`Open report for ${pagePath(page.url)}`}
      >
        {inner}
      </Link>
    </li>
  );
}
