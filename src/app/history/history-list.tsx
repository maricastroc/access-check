"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ScanListItem } from "@/lib/scans";
import { ClearHistoryButton, DeleteScanButton } from "./history-buttons";

type SortKey = "recent" | "score-desc" | "score-asc";
type BandKey = "all" | "pass" | "warn" | "fail";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "score-desc", label: "Highest score" },
  { key: "score-asc", label: "Lowest score" },
];

const BANDS: { key: BandKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pass", label: "Pass" },
  { key: "warn", label: "Warn" },
  { key: "fail", label: "Fail" },
];

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function scoreColor(score: number): string {
  if (score >= 90) return "#16764f";
  if (score >= 70) return "#8a6a00";
  return "#c62a2f";
}

function band(score: number): BandKey {
  if (score >= 90) return "pass";
  if (score >= 70) return "warn";
  return "fail";
}

export function HistoryList({ scans }: { scans: ScanListItem[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [sort, setSort] = useState<SortKey>(() => {
    const s = params.get("sort");
    return s === "score-desc" || s === "score-asc" ? s : "recent";
  });
  const [scoreBand, setScoreBand] = useState<BandKey>(() => {
    const b = params.get("band");
    return b === "pass" || b === "warn" || b === "fail" ? b : "all";
  });

  const deltaById = useMemo(() => {
    const map = new Map<string, number>();
    scans.forEach((scan, i) => {
      const prev = scans.slice(i + 1).find((o) => o.url === scan.url);
      if (prev) map.set(scan.id, scan.score - prev.score);
    });
    return map;
  }, [scans]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = scans.filter((s) => {
      if (scoreBand !== "all" && band(s.score) !== scoreBand) return false;
      if (q && !host(s.finalUrl).toLowerCase().includes(q) && !s.title.toLowerCase().includes(q))
        return false;
      return true;
    });
    if (sort === "score-desc") return [...filtered].sort((a, b) => b.score - a.score);
    if (sort === "score-asc") return [...filtered].sort((a, b) => a.score - b.score);
    return filtered;
  }, [scans, query, sort, scoreBand]);

  function syncUrl(next: { q?: string; sort?: SortKey; band?: BandKey }) {
    const sp = new URLSearchParams();
    const q = next.q ?? query;
    const s = next.sort ?? sort;
    const b = next.band ?? scoreBand;
    if (q.trim()) sp.set("q", q.trim());
    if (s !== "recent") sp.set("sort", s);
    if (b !== "all") sp.set("band", b);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const resultLabel =
    visible.length === scans.length
      ? `${scans.length} scan${scans.length === 1 ? "" : "s"}`
      : `${visible.length} of ${scans.length} scan${scans.length === 1 ? "" : "s"}`;

  const hasScans = scans.length > 0;

  return (
    <>
      <div className="border-b border-line bg-card">
        <div className="mx-auto w-full max-w-7xl px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                History
              </p>
              <div className="mt-0.5 flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-ink">Scan history</h1>
                {hasScans && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="rounded-full bg-chip px-2 py-0.5 text-[12px] font-semibold text-ink-soft"
                  >
                    {resultLabel}
                  </span>
                )}
              </div>
            </div>
            {hasScans && <ClearHistoryButton />}
          </div>

          {hasScans && (
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center gap-2">
                <label htmlFor="history-search" className="sr-only">
                  Search scans by domain
                </label>
                <div className="flex h-9 w-full items-center gap-2.5 rounded-[10px] border border-line-strong bg-card px-3 focus-within:border-brand-400">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    aria-hidden
                    className="text-xs text-muted"
                  />
                  <input
                    id="history-search"
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      syncUrl({ q: e.target.value });
                    }}
                    placeholder="Search by domain…"
                    className="h-full w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        syncUrl({ q: "" });
                      }}
                      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink"
                    >
                      <FontAwesomeIcon icon={faXmark} aria-hidden className="text-xs" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  role="group"
                  aria-label="Filter by score"
                  className="flex h-9 items-center gap-0.5 rounded-[10px] border border-line-strong bg-card p-0.5"
                >
                  {BANDS.map((b) => {
                    const active = b.key === scoreBand;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setScoreBand(b.key);
                          syncUrl({ band: b.key });
                        }}
                        className={`h-full cursor-pointer rounded-[8px] px-3 text-[12.5px] font-medium transition-colors ${
                          active ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                <label htmlFor="history-sort" className="sr-only">
                  Sort scans
                </label>
                <select
                  id="history-sort"
                  value={sort}
                  onChange={(e) => {
                    const s = e.target.value as SortKey;
                    setSort(s);
                    syncUrl({ sort: s });
                  }}
                  className="h-9 cursor-pointer rounded-[10px] border border-line-strong bg-card px-2.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-line-hover focus:border-brand-400 focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-6 pt-8 pb-10">
        {!hasScans ? (
          <NoScans />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-16 text-center">
            <p className="text-base font-semibold text-ink">No scans match your filters</p>
            <p className="mt-1.5 max-w-sm text-sm text-muted">
              Try a different domain or clear the score filter to see everything again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((scan) => (
              <ScanCard key={scan.id} scan={scan} delta={deltaById.get(scan.id) ?? null} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function NoScans() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-16 text-center">
      <p className="text-base font-semibold text-ink">No scans yet</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Run an audit while signed in and it’ll show up here, so you can track each site’s score over
        time.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Run a scan
      </Link>
    </div>
  );
}

function ScanCard({ scan, delta }: { scan: ScanListItem; delta: number | null }) {
  const [loaded, setLoaded] = useState(false);

  const sev = [
    { label: "Critical", value: scan.counts.critical, color: "#c62a2f" },
    { label: "Serious", value: scan.counts.serious, color: "#a85a06" },
    { label: "Moderate", value: scan.counts.moderate, color: "#8a6a00" },
  ];

  return (
    <div className="group relative">
      <DeleteScanButton id={scan.id} />
      <Link
        href={`/report/${scan.id}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition-shadow hover:shadow-card"
      >
        <div className="relative aspect-video overflow-hidden border-b border-line bg-canvas">
          {!loaded && <div aria-hidden className="ac-skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/scan/${scan.id}/screenshot`}
            alt={`Screenshot of ${host(scan.finalUrl)}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-card"
            style={{ background: scoreColor(scan.score) }}
          >
            {scan.score}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">{host(scan.finalUrl)}</span>
              {delta !== null && delta !== 0 && (
                <span
                  className="shrink-0 text-[11px] font-bold"
                  style={{ color: delta > 0 ? "#16764f" : "#c62a2f" }}
                >
                  {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted">{dateFmt.format(scan.createdAt)}</div>
          </div>

          <div className="mt-auto flex items-center gap-3 text-xs text-muted">
            {sev.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.value}
              </span>
            ))}
            <span className="ml-auto font-medium text-success">{scan.counts.passed} passed</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
