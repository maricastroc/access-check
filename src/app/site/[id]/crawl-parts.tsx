"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCircleCheck,
  faClock,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ScoreRing } from "@/components/ui";
import { crawlHost, pagePath, type CrawlPage, type CrawlSnapshot } from "../shared";

const SEV = [
  { key: "critical", label: "Critical", color: "#c62a2f" },
  { key: "serious", label: "Serious", color: "#a85a06" },
  { key: "moderate", label: "Moderate", color: "#8a6a00" },
  { key: "minor", label: "Minor", color: "#6b7079" },
] as const;

function scoreColor(score: number): string {
  if (score >= 90) return "#16764f";
  if (score >= 70) return "#8a6a00";
  return "#c62a2f";
}

export function ProgressHeader({ snap }: { snap: CrawlSnapshot }) {
  const running = snap.status === "running";
  const settled = snap.scannedPages + snap.failedPages;
  const pct = snap.totalPages > 0 ? Math.round((settled / snap.totalPages) * 100) : 0;

  return (
    <section className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {crawlHost(snap.rootUrl)}
          </h1>
          <p className="mt-1 text-sm text-muted">Full-site accessibility audit</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${
            running
              ? "bg-brand-50 text-brand-700"
              : snap.status === "failed"
                ? "bg-[#fdecec] text-critical"
                : "bg-[#e7f5ef] text-success"
          }`}
        >
          {running && <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin" />}
          {running
            ? `Scanning ${settled} / ${snap.totalPages}`
            : snap.status === "failed"
              ? "Audit failed"
              : `Done · ${snap.totalPages} pages`}
        </span>
      </div>

      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Crawl progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            running ? "bg-brand-500" : snap.status === "failed" ? "bg-critical" : "bg-success"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {snap.status === "failed" && snap.error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-soft"
        >
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            aria-hidden
            className="mt-0.5 shrink-0 text-critical"
          />
          <p className="text-ink-soft">{snap.error}</p>
        </div>
      )}
    </section>
  );
}

export function SiteSummary({ snap, score }: { snap: CrawlSnapshot; score: number | null }) {
  const done = snap.pages.filter((p) => p.status === "done");
  const totals = SEV.map((s) => ({
    ...s,
    value: done.reduce((sum, p) => sum + p.counts[s.key], 0),
  }));

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-line bg-card p-5 shadow-soft sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-6">
      <div className="flex items-center gap-4">
        {score !== null ? (
          <ScoreRing value={score} />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full border-8 border-line text-sm text-muted">
            —
          </div>
        )}
        <div className="sm:hidden">
          <p className="text-sm font-semibold text-ink">Site score</p>
          <p className="text-xs text-muted">
            {snap.status === "running" ? "average so far" : "average across pages"}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-4">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-ink">Site score</p>
          <p className="text-xs text-muted">
            {snap.status === "running"
              ? "running average across scanned pages"
              : "average across all scanned pages"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {totals.map((t) => (
            <span key={t.key} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: t.color }} />
              <span className="font-semibold text-ink">{t.value}</span>
              <span className="text-muted">{t.label}</span>
            </span>
          ))}
          {snap.failedPages > 0 && (
            <span className="flex items-center gap-2 text-sm text-critical">
              <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden className="text-xs" />
              {snap.failedPages} page{snap.failedPages > 1 ? "s" : ""} failed
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function PageStatusBadge({ page }: { page: CrawlPage }) {
  if (page.status === "done" && page.score !== null) {
    return (
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: scoreColor(page.score) }}
        aria-label={`Score ${page.score}`}
      >
        {page.score}
      </span>
    );
  }
  if (page.status === "failed") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fdecec] text-critical">
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden />
      </span>
    );
  }
  if (page.status === "running") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin" />
      </span>
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-faint">
      <FontAwesomeIcon icon={faClock} aria-hidden />
    </span>
  );
}

export function PageRow({ page, siteId }: { page: CrawlPage; siteId: string }) {
  const done = page.status === "done";
  const total = page.counts.critical + page.counts.serious + page.counts.moderate + page.counts.minor;

  const inner = (
    <div className="flex items-center gap-3.5 rounded-xl border border-line bg-card px-4 py-3 shadow-soft transition-shadow group-hover:shadow-card">
      <PageStatusBadge page={page} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-medium text-ink">
            {pagePath(page.url)}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {page.status === "failed"
            ? page.error || "Scan failed"
            : page.status === "pending"
              ? "Waiting…"
              : page.status === "running"
                ? "Scanning…"
                : page.title || page.url}
        </div>
      </div>

      {done && (
        <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
          {total === 0 ? (
            <span className="flex items-center gap-1.5 text-success">
              <FontAwesomeIcon icon={faCircleCheck} aria-hidden />
              No violations
            </span>
          ) : (
            SEV.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5" title={s.label}>
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {page.counts[s.key]}
              </span>
            ))
          )}
        </div>
      )}

      {done && (
        <FontAwesomeIcon
          icon={faArrowRight}
          aria-hidden
          className="text-xs text-faint transition-colors group-hover:text-brand-600"
        />
      )}
    </div>
  );

  if (!done) {
    return <li className="group">{inner}</li>;
  }

  return (
    <li className="group">
      <Link
        href={`/results?url=${encodeURIComponent(page.url)}&site=${siteId}`}
        aria-label={`Open report for ${page.url}`}
      >
        {inner}
      </Link>
    </li>
  );
}
