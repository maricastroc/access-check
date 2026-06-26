"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRotateRight,
  faChevronRight,
  faCheck,
  faFileCode,
  faFilePdf,
  faFire,
  faGlobe,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type {
  FixVerification,
  ScanResult,
  Severity,
} from "@/lib/scan/types";
import { CopyableCode } from "@/components/ui/copyable-code";
import {
  modeDesc,
  modeList,
  previewFilters,
  sevDot,
  sevText,
  severityLabel,
  severityOrder,
  type SimKey,
} from "./data";

type Status = "loading" | "done" | "error";

/** id de DOM estável pra uma violação, derivado do título (casa com Fix First). */
function fixDomId(title: string): string {
  return `fix-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
type FilterKey = "all" | Severity | "passed";

/**
 * Selo de validação: provamos o conserto re-rodando o axe depois de aplicá-lo.
 * "unchecked" (fix sem mutação auto-aplicável) não rende selo.
 */
function VerifyPill({ v }: { v: FixVerification }) {
  if (v === "verified")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#e7f6ee] px-1.5 py-[2px] text-[10.5px] font-semibold text-[#1a7f46]">
        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
        Verified — re-scan passes
      </span>
    );
  if (v === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#fdf0e7] px-1.5 py-[2px] text-[10.5px] font-semibold text-[#b8651b]">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
        Needs review — re-scan still flags
      </span>
    );
  return null;
}

const DEFAULT_URL = "example.com";

export function ResultsView({ initialUrl }: { initialUrl: string }) {
  const start = initialUrl || DEFAULT_URL;
  const [input, setInput] = useState(start);
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const [sim, setSim] = useState<SimKey>("normal");
  const [showMarkers, setShowMarkers] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const scan = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) return;
    setStatus("loading");
    setError("");
    setUrl(value);
    setFilter("all");
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

  useEffect(() => {
    scan(initialUrl || DEFAULT_URL);
  }, [initialUrl, scan]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <ColorBlindFilters />
      <TopBar
        status={status}
        onRerun={() => scan(url)}
        busy={status === "loading"}
      />

      {status === "loading" && <ScanningState url={url} />}

      {status === "error" && (
        <ErrorState
          url={input}
          message={error}
          onChange={setInput}
          onRetry={() => scan(input)}
        />
      )}

      {status === "done" && result && (
        <div className="grid grid-cols-1 items-start gap-6 px-7 pt-6 pb-12 lg:grid-cols-[minmax(0,1fr)_524px]">
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
    </div>
  );
}

/* ---------------- Top bar ---------------- */
function TopBar({
  status,
  onRerun,
  busy,
}: {
  status: Status;
  onRerun: () => void;
  busy: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-card px-7">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-[22px] items-center justify-center rounded-md bg-ink">
          <span className="size-[9px] rotate-45 rounded-[2px] bg-brand-500" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          AccessCheck
        </span>
        <span className="ml-0.5 border-l border-line-strong pl-2.5 font-mono text-[11px] text-muted">
          v2.1 · WCAG 2.1
        </span>
      </Link>
      <div className="flex items-center gap-3.5">
        <Link
          href="/"
          className="flex h-[34px] items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          New scan
        </Link>
        <span className="h-5 w-px bg-line-strong" />
        <div className="flex items-center gap-[7px] text-[12.5px] text-ink-soft">
          <span
            className={`size-[7px] rounded-full ${
              status === "done"
                ? "bg-success shadow-[0_0_0_3px_rgba(31,157,107,.14)]"
                : status === "error"
                  ? "bg-critical"
                  : "animate-pulse bg-serious"
            }`}
          />
          {status === "done"
            ? "Analysis complete"
            : status === "error"
              ? "Analysis failed"
              : "Analyzing…"}
        </div>
        <button
          onClick={onRerun}
          disabled={busy}
          className="flex h-[34px] items-center gap-2 rounded-[9px] border border-line-strong bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={faArrowRotateRight}
            className={`text-xs ${busy ? "animate-spin" : ""}`}
          />
          Re-run analysis
        </button>
        <span className="flex size-[30px] items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-300 text-xs font-semibold text-white">
          QA
        </span>
      </div>
    </header>
  );
}

/* ---------------- Loading / Error ---------------- */
function ScanningState({ url }: { url: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
      </span>
      <div>
        <p className="text-lg font-semibold">Auditing the page…</p>
        <p className="mt-1.5 text-sm text-muted">
          Rendering <span className="font-medium text-ink">{url}</span>,
          injecting axe-core and checking 50+ WCAG rules.
        </p>
      </div>
      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-faint">
        <span className="size-1.5 animate-pulse rounded-full bg-brand-400" />
        usually 3–15 seconds
      </div>
    </div>
  );
}

function ErrorState({
  url,
  message,
  onChange,
  onRetry,
}: {
  url: string;
  message: string;
  onChange: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[#fdecec] text-critical">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-xl" />
      </span>
      <div className="max-w-md">
        <p className="text-lg font-semibold">Couldn’t scan that page</p>
        <p className="mt-1.5 text-sm text-muted">{message}</p>
        <p className="mt-1 text-xs text-faint">
          Some sites block bots or sit behind a login — try another URL.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRetry();
        }}
        className="flex w-full max-w-md items-center gap-2 rounded-field border border-line bg-card p-2 shadow-soft"
      >
        <FontAwesomeIcon icon={faGlobe} className="ml-2 text-sm text-muted" />
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
          placeholder="example.com"
        />
        <button
          type="submit"
          className="rounded-[9px] bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Try again
        </button>
      </form>
    </div>
  );
}

/* ---------------- Left preview ---------------- */
function PreviewPanel({
  result,
  input,
  onInput,
  onSubmit,
  sim,
  setSim,
  showMarkers,
  setShowMarkers,
}: {
  result: ScanResult;
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  sim: SimKey;
  setSim: (s: SimKey) => void;
  showMarkers: boolean;
  setShowMarkers: (v: boolean) => void;
}) {
  const simLabel = modeList.find((m) => m.key === sim)!.label;
  const host = safeHost(result.finalUrl);

  return (
    <section className="scroll-slim lg:sticky lg:top-[82px] lg:max-h-[calc(100vh-98px)] lg:overflow-y-auto lg:pr-1.5">
      {/* sticky mas com scroll próprio: o preview é mais alto que a viewport,
          então ganha rolagem interna em vez de prender o scroll da página */}
      {/* meta + URL editável */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex min-w-0 items-center gap-2.5"
        >
          <div className="flex h-[34px] max-w-[420px] items-center gap-2 overflow-hidden rounded-[9px] border border-line bg-card pr-2 pl-3 text-[13px]">
            <span className="size-[7px] shrink-0 rounded-full bg-success" />
            <input
              value={input}
              onChange={(e) => onInput(e.target.value)}
              aria-label="URL to scan"
              className="min-w-0 flex-1 bg-transparent py-1 font-medium focus:outline-none"
            />
          </div>
          <span className="hidden text-xs whitespace-nowrap text-muted sm:block">
            Scanned {result.scannedElements} elements ·{" "}
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        </form>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="text-muted">Viewing as</span>
          <span className="rounded-[7px] bg-brand-50 px-2.5 py-[3px] font-semibold text-brand-600">
            {simLabel}
          </span>
        </div>
      </div>

      {/* seletor de simulação + marcadores */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[11px] bg-[#eaebef] p-1">
          {modeList.map((m) => {
            const active = m.key === sim;
            return (
              <button
                key={m.key}
                onClick={() => setSim(m.key)}
                className={`rounded-lg px-[13px] py-2 text-[12.5px] whitespace-nowrap transition-colors ${
                  active
                    ? "bg-card font-semibold text-ink shadow-[0_1px_2px_rgba(16,18,29,.1),0_0_0_1px_rgba(16,18,29,.04)]"
                    : "font-medium text-ink-soft hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowMarkers(!showMarkers)}
          className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[9px] border px-3 text-xs font-medium transition-colors ${
            showMarkers
              ? "border-brand-200 bg-brand-50 text-brand-600"
              : "border-line-strong bg-card text-muted"
          }`}
        >
          <span
            className={`size-[7px] rounded-full ${showMarkers ? "bg-brand-500" : "bg-faint"}`}
          />
          {showMarkers ? "Markers on" : "Markers off"}
        </button>
      </div>

      <div className="mb-2.5 flex items-center gap-2 text-xs leading-relaxed text-muted">
        <span className="size-[5px] rounded-full bg-[#c2c6ce]" />
        {modeDesc[sim]}
      </div>

      {/* janela do navegador com screenshot real */}
      <div className="overflow-hidden rounded-[14px] border border-line-strong bg-card shadow-[0_1px_2px_rgba(16,18,29,.04),0_14px_40px_-12px_rgba(16,18,29,.14)]">
        <div className="flex h-[42px] items-center gap-3.5 border-b border-line bg-[#f7f8fa] px-3.5">
          <div className="flex gap-[7px]">
            <span className="size-[11px] rounded-full bg-[#ff5f57]" />
            <span className="size-[11px] rounded-full bg-[#febc2e]" />
            <span className="size-[11px] rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-[25px] flex-1 items-center gap-[7px] truncate rounded-[7px] border border-line-strong bg-card px-[11px] font-mono text-[11.5px] text-muted">
            <span className="size-[11px] shrink-0 rounded-full border-[1.5px] border-[#b7bcc4]" />
            <span className="truncate">{host}</span>
          </div>
          <span className="text-[11px] text-faint">Live preview</span>
        </div>

        <div className="relative overflow-hidden bg-card">
          {result.screenshot ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.screenshot}
                alt={`Screenshot of ${host}`}
                className="block w-full transition-[filter] duration-300"
                style={{ filter: previewFilters[sim] }}
              />
              {showMarkers &&
                result.markers.map((m) => {
                  // número ancorado no canto sup. direito da caixa, travado
                  // dentro do preview pra não ser cortado pela borda.
                  const badgeX = clamp(m.left + m.width, 3.5, 96.5);
                  const badgeY = clamp(m.top, 4, 96);
                  return (
                    <span key={m.n}>
                      <span
                        className="pointer-events-none absolute rounded-[6px]"
                        style={{
                          left: `${m.left}%`,
                          top: `${m.top}%`,
                          width: `${m.width}%`,
                          height: `${m.height}%`,
                          border: `2px dashed ${markerColor(m.severity)}`,
                          background: `${markerColor(m.severity)}1f`,
                        }}
                      />
                      <span
                        className="absolute z-10 flex size-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-[0_2px_5px_rgba(0,0,0,.3)]"
                        style={{
                          left: `${badgeX}%`,
                          top: `${badgeY}%`,
                          background: markerColor(m.severity),
                        }}
                      >
                        {m.n}
                      </span>
                    </span>
                  );
                })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              No preview available
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-white/90" />
        </div>
      </div>

      {/* legenda */}
      {result.markers.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="mr-0.5 self-center text-[11.5px] text-muted">
            {result.markers.length} issue
            {result.markers.length > 1 ? "s" : ""} in view
          </span>
          {result.markers.map((m) => (
            <span
              key={m.n}
              className="inline-flex max-w-[220px] items-center gap-[7px] rounded-lg border border-line bg-card py-[5px] pr-2.5 pl-1.5 text-xs text-ink-soft"
            >
              <span
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                style={{ background: markerColor(m.severity) }}
              >
                {m.n}
              </span>
              <span className="truncate">{m.label}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Right report ---------------- */
function ReportPanel({
  result,
  filter,
  setFilter,
}: {
  result: ScanResult;
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
}) {
  const { counts } = result;
  const compliant = counts.critical === 0 && counts.serious === 0;
  const warnings = counts.serious + counts.moderate + counts.minor;

  // Violação que o "View fix" pediu pra focar (por título). Quando setado,
  // garantimos que ela esteja visível, expandimos o <details> e rolamos até ela.
  const [focusFix, setFocusFix] = useState<string | null>(null);

  useEffect(() => {
    if (!focusFix) return;
    // espera o re-render do filtro antes de procurar o elemento
    const t = setTimeout(() => {
      const el = document.getElementById(fixDomId(focusFix));
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setFocusFix(null);
    }, 60);
    return () => clearTimeout(t);
  }, [focusFix]);

  const openFix = (title: string) => {
    setFilter("all"); // tira qualquer filtro que esconderia a violação
    setFocusFix(title);
  };

  const countChips = [
    { label: "Critical", value: counts.critical, dot: "bg-critical" },
    { label: "Serious", value: counts.serious, dot: "bg-serious" },
    { label: "Moderate", value: counts.moderate, dot: "bg-moderate" },
    { label: "Passed", value: counts.passed, dot: "bg-success" },
  ];

  const tiles = [
    {
      label: "Accessibility score",
      value: result.score,
      color: "text-brand-500",
      sub: compliant ? "WCAG AA" : "needs work",
    },
    {
      label: "Critical issues",
      value: counts.critical,
      color: "text-critical",
      sub: "blocking AA",
    },
    {
      label: "Warnings",
      value: warnings,
      color: "text-serious",
      sub: "serious + moderate",
    },
    {
      label: "Passed checks",
      value: counts.passed,
      color: "text-success",
      sub: "auto-checks",
    },
  ];

  const groups = severityOrder
    .map((sev) => ({
      sev,
      items: result.violations.filter((v) => v.severity === sev),
    }))
    .filter((g) => g.items.length > 0);

  const visibleGroups =
    filter === "all" || filter === "passed"
      ? filter === "passed"
        ? []
        : groups
      : groups.filter((g) => g.sev === filter);

  const showPassed = filter === "all" || filter === "passed";

  const tabs: {
    key: FilterKey;
    label: string;
    count: number;
    dot: string | null;
  }[] = [
    { key: "all", label: "All", count: result.violations.length, dot: null },
    ...severityOrder
      .filter((s) => counts[s] > 0)
      .map((s) => ({
        key: s,
        label: severityLabel[s],
        count: counts[s],
        dot: sevDot[s],
      })),
    { key: "passed", label: "Passed", count: counts.passed, dot: "bg-success" },
  ];

  const filterCountLabel =
    filter === "all"
      ? `${result.violations.length} issue${result.violations.length === 1 ? "" : "s"} across ${groups.length} level${groups.length === 1 ? "" : "s"}`
      : filter === "passed"
        ? `${counts.passed} checks passed`
        : `${counts[filter as Severity]} ${filter} issue${counts[filter as Severity] === 1 ? "" : "s"}`;

  return (
    <section className="flex flex-col gap-3.5">
      {/* score panel */}
      <div className="rounded-[18px] border border-line bg-card p-6 shadow-[0_1px_2px_rgba(16,18,29,.04),0_8px_28px_-16px_rgba(16,18,29,.12)]">
        <div className="flex items-center gap-[22px]">
          <div
            className="flex size-[118px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-brand-500) 0 ${result.score}%, var(--color-line) ${result.score}% 100%)`,
            }}
          >
            <div className="flex size-[90px] flex-col items-center justify-center rounded-full bg-card">
              <div className="text-[34px] leading-none font-bold tracking-tight">
                {result.score}
              </div>
              <div className="mt-[3px] font-mono text-[11px] text-faint">
                / 100
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold">
                Accessibility score
              </span>
              {compliant ? (
                <span className="rounded-[7px] bg-[#e6f5ee] px-2.5 py-[3px] text-[11px] font-semibold tracking-wide text-success">
                  WCAG AA
                </span>
              ) : (
                <span className="rounded-[7px] bg-[#fdecec] px-2.5 py-[3px] text-[11px] font-semibold tracking-wide text-critical">
                  {counts.critical + counts.serious} blocker
                  {counts.critical + counts.serious > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[13px] leading-normal text-ink-soft">
              {result.summary}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {countChips.map((c) => (
            <div
              key={c.label}
              className="flex-1 rounded-[11px] border border-line bg-[#fafbfc] px-3 py-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${c.dot}`} />
                <span className="text-lg font-bold tracking-tight">
                  {c.value}
                </span>
              </div>
              <div className="mt-[3px] text-[11px] text-muted">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2.5">
          <Link
            href={`/report?url=${encodeURIComponent(result.finalUrl)}`}
            className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-brand-500 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 active:translate-y-px"
          >
            <FontAwesomeIcon icon={faFilePdf} className="text-sm" />
            Export PDF
          </Link>
          <button className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-card text-[13.5px] font-semibold text-ink transition-colors hover:bg-[#f6f7f9]">
            <FontAwesomeIcon icon={faFileCode} className="text-sm text-muted" />
            Export Markdown
          </button>
        </div>
      </div>

      {/* tiles */}
      <div className="grid grid-cols-4 gap-2.5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-[13px] border border-line bg-card px-3.5 py-3.5 transition-colors hover:border-[#dfe1e6]"
          >
            <div className="h-[26px] text-[10.5px] leading-tight font-medium text-muted">
              {t.label}
            </div>
            <div
              className={`mt-1.5 text-[26px] font-bold tracking-tight ${t.color}`}
            >
              {t.value}
            </div>
            <div className="mt-0.5 text-[10.5px] text-faint">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Fix First */}
      {result.fixFirst.length > 0 && (
        <div className="mt-1 rounded-2xl border border-line bg-card px-[22px] py-5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon
                icon={faFire}
                className="text-base text-serious"
              />
              <span className="text-base font-semibold tracking-tight">
                Fix First
              </span>
            </div>
            <span className="text-xs text-muted">
              Ordered by impact ÷ effort
            </span>
          </div>
          <p className="mb-1.5 text-[12.5px] leading-normal text-muted">
            Resolve these first for the biggest jump in your score.
          </p>
          {result.fixFirst.map((f) => (
            <div
              key={f.n}
              className="flex items-start gap-3.5 border-t border-line px-0.5 py-[15px]"
            >
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-ink font-mono text-[13px] font-semibold text-white">
                {f.n}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="text-xs text-ink-soft">
                    Effort{" "}
                    <span className="font-mono font-semibold text-ink">
                      {f.effort}
                    </span>
                  </span>
                  <span className="h-[11px] w-px bg-line-strong" />
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                    Impact
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                        f.impact === "High"
                          ? "bg-brand-50 text-brand-500"
                          : f.impact === "Medium"
                            ? "bg-[#f0f1f4] text-ink-soft"
                            : "bg-[#f0f1f4] text-muted"
                      }`}
                    >
                      {f.impact}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => openFix(f.title)}
                className="h-[30px] shrink-0 rounded-lg border border-line-strong bg-card px-3 text-xs font-medium text-ink transition-colors hover:bg-[#f4f6f8]"
              >
                View fix
              </button>
            </div>
          ))}
        </div>
      )}

      {/* WCAG Violations */}
      <div className="mt-1">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-base font-semibold tracking-tight">
            WCAG Violations
          </span>
          <span className="text-xs text-muted">{filterCountLabel}</span>
        </div>

        <div className="mb-3.5 flex flex-wrap gap-[7px]">
          {tabs.map((t) => {
            const active = t.key === filter;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`inline-flex items-center gap-[7px] rounded-[9px] border px-[11px] py-1.5 text-[12.5px] transition-colors ${
                  active
                    ? "border-ink bg-ink font-semibold text-white"
                    : "border-line-strong bg-card font-medium text-ink-soft hover:border-[#d6d9df]"
                }`}
              >
                {t.dot && (
                  <span className={`size-[7px] rounded-full ${t.dot}`} />
                )}
                {t.label}
                <span
                  className={`font-mono text-[11px] ${active ? "text-white/65" : "text-faint"}`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {visibleGroups.map((g) => (
          <div key={g.sev} className="mb-[18px]">
            <div className="mb-2.5 flex items-center gap-2">
              <span className={`size-2 rounded-full ${sevDot[g.sev]}`} />
              <span className="text-[12.5px] font-semibold">
                {severityLabel[g.sev]}
              </span>
              <span className="font-mono text-[11.5px] text-faint">
                {g.items.length}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            {g.items.map((it, i) => (
              <details
                key={`${it.id}-${i}`}
                id={fixDomId(it.title)}
                className="mb-2 scroll-mt-24 rounded-xl border border-line bg-card transition-[border-color] hover:border-[#dcdee4]"
              >
                <summary className="flex cursor-pointer items-center gap-3 px-[15px] py-[13px]">
                  <span
                    className={`size-[7px] shrink-0 rounded-full ${sevDot[g.sev]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{it.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-faint">
                      {it.criterion}
                    </div>
                  </div>
                  <span className="max-w-[140px] truncate rounded-md bg-[#f6f7f9] px-2 py-[3px] font-mono text-[11px] text-faint">
                    {it.where}
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="v-chev shrink-0 text-[13px] text-[#b7bcc4] transition-transform duration-200"
                  />
                </summary>
                <div className="pr-[15px] pb-[15px] pl-[35px]">
                  <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                    {it.desc}
                  </p>
                  <div className="rounded-[10px] border border-line bg-[#f7f8fa] px-3 py-[11px]">
                    <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
                      Suggested fix
                    </div>
                    {it.fixGroups && it.fixGroups.length > 0 ? (
                      it.fixGroups.map((fg, gi) => (
                        <div
                          key={gi}
                          className={
                            gi > 0 ? "mt-3 border-t border-line pt-3" : ""
                          }
                        >
                          <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-line text-ink">
                            {fg.text}
                          </div>
                          {fg.code && <CopyableCode code={fg.code} />}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {fg.count > 1 && (
                              <span className="inline-flex items-center rounded-md bg-[#eef0f3] px-1.5 py-[2px] text-[10.5px] font-semibold text-muted">
                                Resolves {fg.count} elements
                              </span>
                            )}
                            <VerifyPill v={fg.verification} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-line text-ink">
                        {it.fix}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ))}

        {showPassed && result.passed.length > 0 && (
          <div className="rounded-xl border border-line bg-card px-4 pt-4 pb-[17px]">
            <div className="mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-[12.5px] font-semibold">Passed</span>
              <span className="font-mono text-[11.5px] text-faint">
                {result.passed.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {result.passed.map((p, i) => (
                <span
                  key={`${p}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#dceee3] bg-[#eef7f1] px-2.5 py-1 text-[11.5px] text-[#3f7a5f]"
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="text-[10px] text-success"
                  />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- helpers ---------------- */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function markerColor(sev: Severity): string {
  return {
    critical: "#e5484d",
    serious: "#f2820a",
    moderate: "#d9a400",
    minor: "#9ca1ab",
  }[sev];
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function ColorBlindFilters() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      className="absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <filter id="cb-deut">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0 0 0  0.70 0.30 0 0 0  0 0.30 0.70 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="cb-prot">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="cb-trit">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
