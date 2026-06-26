"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRightLong,
  faCheck,
  faExclamation,
  faPrint,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { computeScore } from "@/lib/scan/derive";
import type { ScanResult, Severity } from "@/lib/scan/types";

type Status = "loading" | "done" | "error";

const DEFAULT_URL = "example.com";

const sevHex: Record<Severity, string> = {
  critical: "#e5484d",
  serious: "#f2820a",
  moderate: "#d9a400",
  minor: "#9ca1ab",
};
const sevTint: Record<Severity, string> = {
  critical: "#fdecec",
  serious: "#fef1e2",
  moderate: "#fbf4dc",
  minor: "#f0f1f4",
};
const sevLabel: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

export function ReportView({ initialUrl }: { initialUrl: string }) {
  const start = initialUrl || DEFAULT_URL;
  const [url, setUrl] = useState(start);
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const scan = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) return;
    setStatus("loading");
    setError("");
    setUrl(value);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed.");
      setResult(json as ScanResult);
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
    <div className="ac-canvas min-h-screen bg-canvas font-sans text-ink">
      <PrintStyles />
      <Toolbar url={url} status={status} />

      {status === "loading" && (
        <CenterState
          icon={faSpinner}
          spin
          progress
          title="Building report…"
          subtitle={`Rendering ${url} and running the WCAG audit.`}
        />
      )}

      {status === "error" && (
        <CenterState
          icon={faTriangleExclamation}
          tone="critical"
          title="Couldn’t build the report"
          subtitle={error}
          action={
            <Link
              href="/"
              className="mt-2 rounded-[10px] bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              New scan
            </Link>
          }
        />
      )}

      {status === "done" && result && (
        <div className="flex flex-col items-center gap-8 overflow-x-auto px-5 py-10">
          <Page1 result={result} />
          <Page2 result={result} />
          <Page3 result={result} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Toolbar (não imprime) ---------------- */
function Toolbar({ url, status }: { url: string; status: Status }) {
  return (
    <header className="ac-toolbar sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-card px-7">
      <div className="flex items-center gap-3.5">
        <Link
          href={`/results?url=${encodeURIComponent(url)}`}
          className="flex h-[34px] items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Back to results
        </Link>
        <span className="h-5 w-px bg-line-strong" />
        <span className="text-[13px] font-medium">Exportable report</span>
      </div>
      <button
        onClick={() => window.print()}
        disabled={status !== "done"}
        className="flex h-[34px] items-center gap-2 rounded-[9px] bg-brand-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={faPrint} className="text-xs" />
        Print / Save as PDF
      </button>
    </header>
  );
}

function CenterState({
  icon,
  spin,
  tone = "brand",
  title,
  subtitle,
  progress,
  action,
}: {
  icon: typeof faSpinner;
  spin?: boolean;
  tone?: "brand" | "critical";
  title: string;
  subtitle: string;
  progress?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-2xl ${
          tone === "critical"
            ? "bg-[#fdecec] text-critical"
            : "bg-brand-50 text-brand-500"
        }`}
      >
        <FontAwesomeIcon
          icon={icon}
          className={`text-xl ${spin ? "animate-spin" : ""}`}
        />
      </span>
      <div className="max-w-md">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </div>
      {progress && (
        <div
          role="progressbar"
          aria-label="Running accessibility audit"
          className="relative mt-1 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-line"
        >
          <span className="ac-indeterminate" />
        </div>
      )}
      {action}
    </div>
  );
}

/* ---------------- Shell de página A4/Letter ---------------- */
function PageShell({
  children,
  page,
  host,
}: {
  children: React.ReactNode;
  page: number;
  host: string;
}) {
  return (
    <section className="ac-page flex min-h-[11in] w-[8.5in] flex-col rounded-2xl bg-card px-[0.62in] py-[0.5in] shadow-card">
      <div className="flex flex-1 flex-col">{children}</div>
      <PageFooter page={page} host={host} />
    </section>
  );
}

function PageFooter({ page, host }: { page: number; host: string }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[10px] font-medium text-muted">
      <span className="flex items-center gap-1.5">
        <BrandMark size={14} />
        <span className="text-ink-soft">
          Generated by <b className="font-bold text-ink">AccessCheck</b>
        </span>
      </span>
      <span className="truncate px-2 font-mono text-[9.5px]">{host}</span>
      <span>WCAG 2.1 · Page {page} / 3</span>
    </div>
  );
}

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-ink"
      style={{ width: size, height: size }}
    >
      <span
        className="rotate-45 rounded-[2px] bg-brand-500"
        style={{ width: size * 0.4, height: size * 0.4 }}
      />
    </span>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-[0.2em] text-brand-600 uppercase">
      {children}
    </span>
  );
}

/* ===================== PAGE 1 — Executive Summary ===================== */
function Page1({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const compliant = result.counts.critical === 0 && result.counts.serious === 0;
  const blockers = result.counts.critical + result.counts.serious;
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const meta = [
    { label: "Analysis Date", value: date },
    {
      label: "Scan Duration",
      value: `${(result.durationMs / 1000).toFixed(1)}s`,
    },
    { label: "WCAG Version", value: "2.1 — Level AA" },
    { label: "Elements Scanned", value: String(result.scannedElements) },
  ];

  const counts: { label: string; sub: string; value: number; color: string }[] =
    [
      {
        label: "Critical",
        sub: "Must fix",
        value: result.counts.critical,
        color: sevHex.critical,
      },
      {
        label: "Serious",
        sub: "High priority",
        value: result.counts.serious,
        color: sevHex.serious,
      },
      {
        label: "Moderate",
        sub: "To review",
        value: result.counts.moderate,
        color: sevHex.moderate,
      },
      {
        label: "Passed",
        sub: "Conformant",
        value: result.counts.passed,
        color: "#1f9d6b",
      },
    ];

  const fixes = result.fixFirst.map((f) => {
    const v = result.violations.find((x) => x.title === f.title);
    return { ...f, criterion: v?.criterion, fix: v?.fix };
  });

  return (
    <PageShell page={1} host={host}>
      {/* brand header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={34} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold tracking-tight">
              AccessCheck
            </span>
            <span className="text-[8.5px] font-semibold tracking-[0.17em] text-muted uppercase">
              Accessibility Platform
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-[9.5px] font-semibold tracking-[0.18em] text-muted uppercase">
            WCAG 2.1 Audit
          </span>
          <span className="font-mono text-[11px] text-ink-soft">
            Report&nbsp;#AC-{new Date().getFullYear()}-
            {shortId(result.finalUrl)}
          </span>
        </div>
      </div>

      {/* title */}
      <div className="mt-6">
        <SectionKicker>Exported Accessibility Report</SectionKicker>
        <h1 className="mt-2 text-[40px] leading-[1.02] font-bold tracking-tight text-ink">
          Accessibility Report
        </h1>
        <span className="mt-2.5 inline-block border-b border-brand-200 pb-0.5 text-[15.5px] font-medium text-brand-600">
          {host}
        </span>
      </div>

      {/* meta grid */}
      <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {meta.map((m) => (
          <div key={m.label} className="bg-card px-4 py-2.5">
            <div className="text-[8.5px] font-semibold tracking-[0.14em] text-muted uppercase">
              {m.label}
            </div>
            <div className="mt-1 text-[14px] font-medium text-ink">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* hero: score + compliance + counts */}
      <div className="mt-3 grid grid-cols-[2.42in_1fr] gap-4">
        {/* score card */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-linear-to-br from-brand-600 to-brand-800 px-4 py-4 text-white shadow-card">
          <span className="text-[9px] font-semibold tracking-[0.2em] text-white/60 uppercase">
            Overall Score
          </span>
          <HeroRing value={result.score} />
          <span className="rounded-full bg-brand-200 px-4 py-1 text-[12px] font-bold tracking-wide text-brand-900">
            {compliant ? "WCAG AA" : "Level AA"}
          </span>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-3">
          {/* compliance */}
          <div
            className="flex items-center gap-3.5 rounded-2xl border px-4 py-3"
            style={{
              background: compliant ? "#e6f5ee" : sevTint.serious,
              borderColor: compliant ? "#bfe6d3" : "#ecd8bd",
            }}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: compliant ? "#1f9d6b" : sevHex.serious }}
            >
              <FontAwesomeIcon icon={compliant ? faCheck : faExclamation} />
            </span>
            <div>
              <span
                className="text-[9px] font-semibold tracking-[0.16em] uppercase"
                style={{ color: compliant ? "#1f7a55" : "#b96a26" }}
              >
                Compliance Status
              </span>
              <div
                className="mt-0.5 text-[17px] font-semibold tracking-tight"
                style={{ color: compliant ? "#155e3f" : "#7a4316" }}
              >
                {compliant ? "Meets Level AA" : "Needs Attention"}
              </div>
              <div
                className="mt-0.5 text-[12px]"
                style={{ color: compliant ? "#2f7a5a" : "#8a5a2e" }}
              >
                {compliant
                  ? "No critical or serious blockers detected."
                  : `${blockers} issue${blockers > 1 ? "s" : ""} blocking full Level AA compliance.`}
              </div>
            </div>
          </div>

          {/* count cards */}
          <div className="grid grid-cols-4 gap-2.5">
            {counts.map((c) => (
              <div
                key={c.label}
                className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3"
              >
                <span
                  className="h-1 w-5 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="text-[27px] leading-none font-bold tracking-tight text-ink">
                  {c.value}
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-ink">
                    {c.label}
                  </div>
                  <div className="mt-px text-[9px] text-muted">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* executive summary */}
      <div className="mt-4">
        <SectionKickerMuted>Executive Summary</SectionKickerMuted>
        <p className="mt-2 max-w-[6.7in] text-[13px] leading-[1.5] text-ink-soft">
          {result.summary} The page passed{" "}
          <strong className="font-semibold text-ink">
            {result.counts.passed} automated checks
          </strong>
          {blockers > 0 ? (
            <>
              {" "}
              but {blockers} blocking issue{blockers > 1 ? "s" : ""} remain
              {blockers > 1 ? "" : "s"}. Resolving the priority fixes below
              would raise the score toward Level&nbsp;AA conformance.
            </>
          ) : (
            <> with no critical or serious blockers — a strong baseline.</>
          )}
        </p>
      </div>

      {/* top priority fixes */}
      {fixes.length > 0 && (
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <SectionKicker>Priority Roadmap</SectionKicker>
              <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-ink">
                Top Priority Fixes
              </h2>
            </div>
            <span className="pb-0.5 text-[11px] text-muted">
              Ranked by impact ÷ effort
            </span>
          </div>

          <div className="mt-2.5 overflow-hidden rounded-2xl border border-line">
            {fixes.map((f, i) => (
              <div
                key={f.n}
                className={`grid grid-cols-[36px_1fr_92px] items-center gap-3.5 px-4 py-2.5 ${
                  i < fixes.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="text-[28px] leading-none font-bold text-brand-600">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">
                      {f.title}
                    </span>
                    {f.criterion && (
                      <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-soft">
                        {f.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                    <span>
                      <b className="font-semibold text-ink">Effort</b>{" "}
                      {f.effort}
                    </span>
                    <span className="text-line-strong">·</span>
                    <span>
                      <b className="font-semibold text-ink">Impact</b>{" "}
                      {f.impact}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                    style={{
                      color:
                        f.impact === "High" ? sevHex.critical : sevHex.serious,
                      background:
                        f.impact === "High"
                          ? sevTint.critical
                          : sevTint.serious,
                    }}
                  >
                    {f.impact} impact
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ===================== PAGE 2 — Detailed Findings ===================== */
function Page2({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const detailed: Severity[] = ["critical", "serious"];

  return (
    <PageShell page={2} host={host}>
      <MiniHeader host={host} />

      <div className="mt-5">
        <SectionKicker>Section 02</SectionKicker>
        <h2 className="mt-1.5 text-[30px] font-bold tracking-tight text-ink">
          Detailed Findings
        </h2>
        <p className="mt-1.5 max-w-[6in] text-[12px] leading-[1.45] text-muted">
          Every flagged issue grouped by severity and mapped to its
          WCAG&nbsp;2.1 success criterion, with the impact and a concrete fix
          for each.
        </p>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(["critical", "serious", "moderate"] as Severity[]).map((s) => (
          <LegendChip key={s} sev={s} count={result.counts[s]} />
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink">
          <span className="size-2 rounded-full bg-success" />
          Passed{" "}
          <b className="font-medium text-muted">{result.counts.passed}</b>
        </span>
      </div>

      {detailed.map((sev) => {
        const items = result.violations.filter((v) => v.severity === sev);
        if (items.length === 0) return null;
        return (
          <div key={sev} className="mt-4">
            <GroupHeading sev={sev} count={items.length} />
            <div className="mt-2.5 flex flex-col gap-2.5">
              {items.slice(0, sev === "critical" ? 3 : 2).map((v, i) => (
                <DetailedCard key={`${v.id}-${i}`} v={v} />
              ))}
              {items.length > (sev === "critical" ? 3 : 2) && (
                <p className="px-1 text-[10px] text-muted">
                  + {items.length - (sev === "critical" ? 3 : 2)} more{" "}
                  {sevLabel[sev].toLowerCase()} item
                  {items.length - (sev === "critical" ? 3 : 2) > 1
                    ? "s"
                    : ""}{" "}
                  in the full log
                </p>
              )}
            </div>
          </div>
        );
      })}

      {result.counts.critical === 0 && result.counts.serious === 0 && (
        <div className="mt-5 rounded-2xl border border-[#bfe6d3] bg-[#f3f8f5] p-5 text-[13px] text-[#2f7a5a]">
          <FontAwesomeIcon icon={faCheck} className="mr-2 text-success" />
          No critical or serious violations were detected on this page.
        </div>
      )}
    </PageShell>
  );
}

function DetailedCard({ v }: { v: ScanResult["violations"][number] }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-card"
      style={{ borderColor: `${sevHex[v.severity]}40` }}
    >
      <div className="grid grid-cols-[1fr_1.7in]">
        <div className="border-r border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">
              {v.title}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase"
              style={{
                color: sevHex[v.severity],
                background: sevTint[v.severity],
                borderColor: `${sevHex[v.severity]}55`,
              }}
            >
              {sevLabel[v.severity]}
            </span>
            <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-soft">
              {v.criterion.split(" · ")[0]}
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-soft">
            {v.desc}
          </p>
          <div className="mt-2">
            <FieldLabel tone="brand">Suggested fix</FieldLabel>
            <div className="mt-0.5 font-mono text-[11px] leading-[1.45] whitespace-pre-line text-ink">
              {v.fix}
            </div>
            {v.fixCode && (
              <code className="mt-1.5 block rounded-md border border-line bg-[#f6f8fa] px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] whitespace-pre-wrap text-ink">
                {v.fixCode}
              </code>
            )}
          </div>
        </div>
        {/* meta panel */}
        <div className="flex flex-col gap-2.5 bg-[#fafbfc] p-3.5">
          <FieldLabel>Where</FieldLabel>
          <code className="-mt-1.5 truncate rounded-md bg-card px-2 py-1 font-mono text-[10px] text-ink-soft">
            {v.where}
          </code>
          <FieldLabel>Instances</FieldLabel>
          <span className="-mt-1.5 text-[20px] font-bold text-ink">
            {v.nodes}
          </span>
          <FieldLabel>Criterion</FieldLabel>
          <span className="-mt-1.5 text-[11px] text-ink-soft">
            {v.criterion}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE 3 — Progress & Recommendations ===================== */
function Page3({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const moderate = result.violations.filter((v) => v.severity === "moderate");

  const remaining = result.violations.filter(
    (v) => v.severity !== "critical" && v.severity !== "serious",
  );
  const estimated = Math.max(result.score, computeScore(remaining));
  const delta = estimated - result.score;

  const deltas = [
    {
      label: "Critical",
      from: result.counts.critical,
      to: 0,
      sev: "critical" as Severity,
    },
    {
      label: "Serious",
      from: result.counts.serious,
      to: 0,
      sev: "serious" as Severity,
    },
    {
      label: "Moderate",
      from: result.counts.moderate,
      to: result.counts.moderate,
      sev: "moderate" as Severity,
    },
  ];

  const recs = [
    {
      color: sevHex.critical,
      term: "Immediate · 0–1 week",
      title: "Resolve all critical issues",
      body: `Clear the ${result.counts.critical} critical blocker${result.counts.critical === 1 ? "" : "s"} to unlock Level AA conformance.`,
    },
    {
      color: sevHex.serious,
      term: "Short term · 2–4 weeks",
      title: "Address serious issues",
      body: `Work through the ${result.counts.serious} serious finding${result.counts.serious === 1 ? "" : "s"} across templates and shared components.`,
    },
    {
      color: "var(--color-brand-600)",
      term: "Long term · 1–3 months",
      title: "Refine & re-audit",
      body: "Clear remaining moderate items, add manual screen-reader testing, and schedule a follow-up audit.",
    },
  ];

  return (
    <PageShell page={3} host={host}>
      <MiniHeader host={host} />

      {/* moderate + passed */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span className="size-2.5 rounded-[3px] bg-moderate" />
            <span className="text-[13px] font-semibold text-ink">Moderate</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: sevHex.moderate, background: sevTint.moderate }}
            >
              {result.counts.moderate} issue
              {result.counts.moderate === 1 ? "" : "s"}
            </span>
          </div>
          <div className="px-4 pt-1 pb-2">
            {moderate.slice(0, 4).map((v, i) => (
              <div
                key={`${v.id}-${i}`}
                className={`flex items-center justify-between py-2 ${
                  i < Math.min(moderate.length, 4) - 1
                    ? "border-b border-line"
                    : ""
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-[12px] font-semibold text-ink">
                    {v.title}
                  </div>
                  <div className="mt-px truncate text-[10px] text-muted">
                    {v.criterion.split(" · ")[1] ?? v.criterion}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-canvas px-1.5 py-1 font-mono text-[9px] font-semibold text-ink-soft">
                  {v.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                </span>
              </div>
            ))}
            {moderate.length > 4 && (
              <div className="py-2 text-[10px] text-muted">
                + {moderate.length - 4} more moderate item
                {moderate.length - 4 > 1 ? "s" : ""} in the full log
              </div>
            )}
            {moderate.length === 0 && (
              <div className="py-3 text-[11px] text-muted">
                No moderate issues found.
              </div>
            )}
          </div>
        </div>

        {/* passed */}
        <div className="overflow-hidden rounded-2xl border border-[#cfe3dc] bg-[#f3f8f5]">
          <div className="flex items-center gap-2.5 border-b border-[#dceee3] px-4 py-3">
            <span className="size-2.5 rounded-[3px] bg-success" />
            <span className="text-[13px] font-semibold text-ink">
              Passed Checks
            </span>
            <span className="rounded-full bg-[#e3efe8] px-2 py-0.5 text-[10px] font-semibold text-success">
              {result.counts.passed} conformant
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-4">
            {result.passed.slice(0, 10).map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="flex items-start gap-1.5 text-[11px] font-medium text-ink-soft"
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  className="mt-[3px] shrink-0 text-[10px] text-success"
                />
                <span className="leading-snug break-words">{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* progress band */}
      <div className="mt-5 rounded-2xl border border-[#cfe3dc] bg-linear-to-br from-brand-50 to-[#eaf2ee] p-5">
        <div className="flex items-end justify-between">
          <div>
            <SectionKicker>Projected Outcome</SectionKicker>
            <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-ink">
              Accessibility Progress
            </h2>
          </div>
          <span className="max-w-[2.6in] pb-0.5 text-right text-[10.5px] text-ink-soft">
            After resolving critical &amp; serious issues
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[2.9in_1fr] items-center gap-6">
          <div className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3.5">
            <div className="text-center">
              <div className="text-[8.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                Current
              </div>
              <div className="mt-1 text-[38px] leading-none font-bold text-muted">
                {result.score}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FontAwesomeIcon
                icon={faArrowRightLong}
                className="text-brand-500"
              />
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                +{delta} pts
              </span>
            </div>
            <div className="text-center">
              <div className="text-[8.5px] font-semibold tracking-[0.12em] text-brand-600 uppercase">
                Estimated
              </div>
              <div className="mt-1 text-[38px] leading-none font-bold text-brand-600">
                {estimated}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {deltas.map((d) => {
              const resolved = d.from - d.to;
              return (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-[74px] shrink-0 text-[11px] font-semibold text-ink">
                    {d.label}
                  </span>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full border border-black/5 bg-line">
                    {d.from > 0 && (
                      <>
                        <span
                          style={{
                            width: `${(resolved / d.from) * 100}%`,
                            background: "var(--color-success)",
                          }}
                        />
                        <span
                          style={{
                            width: `${(d.to / d.from) * 100}%`,
                            background: sevHex[d.sev],
                          }}
                        />
                      </>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-soft">
                    <b style={{ color: sevHex[d.sev] }}>{d.from}</b> →{" "}
                    <b className="text-success">{d.to}</b>
                  </span>
                </div>
              );
            })}
            {/* legenda */}
            <div className="mt-0.5 flex items-center gap-4 pl-[86px] text-[10px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success" />
                Resolved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-moderate" />
                Still open
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 border-t border-[#cfe3dc] pt-3 text-[11px] leading-[1.5] text-ink-soft">
          Resolving the critical and serious findings is projected to raise the
          score to an estimated{" "}
          <b className="text-brand-600">{estimated} / 100</b>, clearing every
          Level&nbsp;AA blocker.
        </div>
      </div>

      {/* final recommendations */}
      <div className="mt-5">
        <SectionKickerMuted>Action Plan</SectionKickerMuted>
        <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-ink">
          Final Recommendations
        </h2>
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {recs.map((r) => (
            <div
              key={r.term}
              className="rounded-2xl border border-line bg-card p-4"
            >
              <span
                className="inline-block h-1 w-6 rounded-full"
                style={{ background: r.color }}
              />
              <div
                className="mt-2.5 text-[9px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: r.color }}
              >
                {r.term}
              </div>
              <div className="mt-1.5 text-[14px] font-semibold text-ink">
                {r.title}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-soft">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-[6.8in] text-[9.5px] leading-[1.5] text-muted">
        This report reflects an automated scan against WCAG 2.1 Level&nbsp;AA.
        Automated testing covers roughly 57% of success criteria; manual review
        with assistive technology is recommended for full conformance
        certification.
      </p>
    </PageShell>
  );
}

/* ---------------- bits ---------------- */
function MiniHeader({ host }: { host: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3">
      <div className="flex items-center gap-2.5">
        <BrandMark size={24} />
        <span className="text-[13px] font-bold text-ink">AccessCheck</span>
      </div>
      <span className="truncate pl-3 font-mono text-[10.5px] text-muted">
        Accessibility Report · {host}
      </span>
    </div>
  );
}

function LegendChip({ sev, count }: { sev: Severity; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink">
      <span
        className="size-2 rounded-full"
        style={{ background: sevHex[sev] }}
      />
      {sevLabel[sev]} <b className="font-medium text-muted">{count}</b>
    </span>
  );
}

function GroupHeading({ sev, count }: { sev: Severity; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="size-2.5 rounded-[3px]"
        style={{ background: sevHex[sev] }}
      />
      <span className="text-[13px] font-semibold text-ink">
        {sevLabel[sev]}
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color: sevHex[sev], background: sevTint[sev] }}
      >
        {count} issue{count > 1 ? "s" : ""}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function FieldLabel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "brand";
}) {
  return (
    <div
      className={`text-[8.5px] font-semibold tracking-[0.13em] uppercase ${
        tone === "brand" ? "text-brand-600" : "text-muted"
      }`}
    >
      {children}
    </div>
  );
}

function SectionKickerMuted({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
      {children}
    </span>
  );
}

function HeroRing({ value }: { value: number }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div className="relative size-[138px]">
      <svg width="138" height="138" viewBox="0 0 138 138">
        <circle
          cx="69"
          cy="69"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="11"
        />
        <circle
          cx="69"
          cy="69"
          r={r}
          fill="none"
          stroke="#bcd2ff"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 69 69)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[46px] leading-none font-bold text-white">
          {value}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-white/60">
          OUT OF 100
        </span>
      </div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: letter; margin: 0; }
        body { background: #fff !important; }
        .ac-toolbar { display: none !important; }
        .ac-canvas { background: #fff !important; }
        .ac-page {
          box-shadow: none !important;
          border-radius: 0 !important;
          break-after: page;
        }
        .ac-page:last-child { break-after: auto; }
      }
    `}</style>
  );
}

/* ---------------- helpers ---------------- */
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function shortId(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}
