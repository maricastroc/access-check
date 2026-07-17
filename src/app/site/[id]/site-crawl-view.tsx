"use client";

import { useCallback, useEffect, useState } from "react";
import { aggregateScore } from "@/lib/scan/site-aggregate";
import { CrawlShell } from "../chrome";
import type { CrawlSnapshot } from "../shared";
import { PageRow, ProgressHeader, SiteSummary } from "./crawl-parts";

const POLL_MS = 2000;

export function SiteCrawlView({ initial }: { initial: CrawlSnapshot }) {
  const [snap, setSnap] = useState<CrawlSnapshot>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/site-scan/${initial.id}`, { cache: "no-store" });
      if (res.ok) setSnap((await res.json()) as CrawlSnapshot);
    } catch {
      //
    }
  }, [initial.id]);

  useEffect(() => {
    if (snap.status !== "running") return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [snap.status, refresh]);

  const hasResults = snap.pages.some((p) => p.status === "done");
  const displayScore =
    snap.score ??
    (hasResults
      ? aggregateScore(snap.pages.map((p) => ({ status: p.status, score: p.score })))
      : null);

  const pending = snap.pages.filter((p) => p.status === "pending" || p.status === "running").length;

  return (
    <CrawlShell>
      <ProgressHeader snap={snap} />

      {(hasResults || snap.status !== "running") && (
        <SiteSummary snap={snap} score={displayScore} />
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {snap.pages.map((page) => (
          <PageRow key={page.id} page={page} siteId={snap.id} />
        ))}
      </ul>

      {snap.status === "running" && pending > 0 && (
        <p className="mt-4 text-center text-xs text-muted" aria-live="polite">
          {pending} page{pending > 1 ? "s" : ""} still in the queue…
        </p>
      )}
    </CrawlShell>
  );
}
