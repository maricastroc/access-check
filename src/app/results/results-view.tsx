"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faSitemap, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { Button } from "@/components/ui";
import { type SimKey } from "./data";
import { DEFAULT_URL, type FilterKey, type Status } from "./shared";
import { ColorBlindFilters } from "./color-blind-filters";
import { TopBar } from "./top-bar";
import { ScanningState, ErrorState } from "./states";
import { PreviewPanel } from "./preview-panel";
import { ReportPanel } from "./report-panel";

type HeaderUser = { name?: string | null; email?: string | null; image?: string | null };

export function ResultsView({
  initialUrl,
  siteId,
  initialResult,
  user,
  signOutAction,
}: {
  initialUrl: string;
  siteId: string | null;
  initialResult: ScanResult | null;
  user: HeaderUser | null;
  signOutAction: () => Promise<void>;
}) {
  const start = initialUrl || DEFAULT_URL;
  const [input, setInput] = useState(start);
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>(initialResult ? "done" : "loading");
  const [result, setResult] = useState<ScanResult | null>(initialResult);
  const [error, setError] = useState("");
  const [fromCrawl, setFromCrawl] = useState(Boolean(initialResult));

  const [sim, setSim] = useState<SimKey>("normal");
  const [showMarkers, setShowMarkers] = useState(true);
  const [showFocusPath, setShowFocusPath] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const runFetch = useCallback(async (value: string) => {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed.");
      setResult(json as ScanResult);
      setUrl((json as ScanResult).finalUrl || value);
      setFromCrawl(false);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
      setStatus("error");
    }
  }, []);

  const scan = useCallback(
    (target: string) => {
      const value = target.trim();
      if (!value) return;
      setStatus("loading");
      setError("");
      setUrl(value);
      setFilter("all");
      void runFetch(value);
    },
    [runFetch],
  );

  useEffect(() => {
    if (initialResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runFetch(initialUrl || DEFAULT_URL);
  }, [initialUrl, initialResult, runFetch]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <ColorBlindFilters />
      <TopBar
        onRerun={() => scan(url)}
        busy={status === "loading"}
        siteId={siteId}
        rerunLabel={fromCrawl ? "Run full analysis" : "Re-run analysis"}
        user={user}
        signOutAction={signOutAction}
      />

      <main id="main">
        {status === "loading" && <ScanningState url={url} />}

        {status === "error" && (
          <ErrorState url={input} message={error} onChange={setInput} onRetry={() => scan(input)} />
        )}

        {status === "done" && result && (
          <>
            {fromCrawl && (
              <div role="status" className="mx-auto w-full max-w-7xl px-6 pt-6">
                <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faSitemap}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-brand-600"
                    />
                    <p className="text-ink-soft">
                      <span className="font-semibold text-ink">Quick scan from the site audit.</span>{" "}
                      Run the full analysis to add the screenshot preview, keyboard and
                      fix-verification passes — the score may adjust.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    icon={faArrowRotateRight}
                    onClick={() => scan(url)}
                    className="shrink-0"
                  >
                    Run full analysis
                  </Button>
                </div>
              </div>
            )}
            {result.partial && (
              <div role="status" className="mx-auto w-full max-w-7xl px-6 pt-6">
                <div className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-soft">
                  <FontAwesomeIcon
                    icon={faClock}
                    aria-hidden
                    className="mt-0.5 shrink-0 text-warning"
                  />
                  <p className="text-ink-soft">
                    <span className="font-semibold text-ink">Partial scan.</span> This page was large
                    enough that the deep passes (fix verification, keyboard, and responsive checks)
                    were skipped to return the core WCAG results in time — the violations and score
                    below are complete.
                  </p>
                </div>
              </div>
            )}
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-6 px-6 pt-6 pb-12 lg:grid-cols-[minmax(0,1fr)_524px]">
              <PreviewPanel
                result={result}
                input={input}
                onInput={setInput}
                onSubmit={() => scan(input)}
                sim={sim}
                setSim={setSim}
                showMarkers={showMarkers}
                setShowMarkers={setShowMarkers}
                showFocusPath={showFocusPath}
                setShowFocusPath={setShowFocusPath}
              />
              <ReportPanel result={result} filter={filter} setFilter={setFilter} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
