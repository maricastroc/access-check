"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
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
  user,
  signOutAction,
}: {
  initialUrl: string;
  user: HeaderUser | null;
  signOutAction: () => Promise<void>;
}) {
  const start = initialUrl || DEFAULT_URL;
  const [input, setInput] = useState(start);
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const [sim, setSim] = useState<SimKey>("normal");
  const [showMarkers, setShowMarkers] = useState(true);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runFetch(initialUrl || DEFAULT_URL);
  }, [initialUrl, runFetch]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <ColorBlindFilters />
      <TopBar
        status={status}
        onRerun={() => scan(url)}
        busy={status === "loading"}
        user={user}
        signOutAction={signOutAction}
      />

      <main id="main">
        {status === "loading" && <ScanningState url={url} />}

        {status === "error" && (
          <ErrorState url={input} message={error} onChange={setInput} onRetry={() => scan(input)} />
        )}

        {status === "done" && result && (
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
            />
            <ReportPanel result={result} filter={filter} setFilter={setFilter} />
          </div>
        )}
      </main>
    </div>
  );
}
