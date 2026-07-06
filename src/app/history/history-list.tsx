"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ScanListItem } from "@/lib/scans";
import { ClearHistoryButton } from "./history-buttons";
import { band, host, type BandKey, type SortKey } from "./history-utils";
import { HistoryToolbar } from "./history-toolbar";
import { ScanCard } from "./scan-card";

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
            <HistoryToolbar
              query={query}
              sort={sort}
              scoreBand={scoreBand}
              onQuery={(v) => {
                setQuery(v);
                syncUrl({ q: v });
              }}
              onSort={(v) => {
                setSort(v);
                syncUrl({ sort: v });
              }}
              onBand={(v) => {
                setScoreBand(v);
                syncUrl({ band: v });
              }}
            />
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
