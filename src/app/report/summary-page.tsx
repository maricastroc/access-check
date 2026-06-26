import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { safeHost, sevHex, sevTint, shortId } from "./shared";
import { BrandMark, HeroRing, PageShell, SectionKicker, SectionKickerMuted } from "./primitives";

export function SummaryPage({ result }: { result: ScanResult }) {
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

  const counts: { label: string; sub: string; value: number; color: string }[] = [
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={34} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold tracking-tight">AccessCheck</span>
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
            Report&nbsp;#AC-{new Date().getFullYear()}-{shortId(result.finalUrl)}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <SectionKicker>Exported Accessibility Report</SectionKicker>
        <h1 className="mt-2 text-[40px] leading-[1.02] font-bold tracking-tight text-ink">
          Accessibility Report
        </h1>
        <span className="mt-2.5 inline-block border-b border-brand-200 pb-0.5 text-[15.5px] font-medium text-brand-600">
          {host}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {meta.map((m) => (
          <div key={m.label} className="bg-card px-4 py-2.5">
            <div className="text-[8.5px] font-semibold tracking-[0.14em] text-muted uppercase">
              {m.label}
            </div>
            <div className="mt-1 text-[14px] font-medium text-ink">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[2.42in_1fr] gap-4">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-linear-to-br from-brand-600 to-brand-800 px-4 py-4 text-white shadow-card">
          <span className="text-[9px] font-semibold tracking-[0.2em] text-white/60 uppercase">
            Overall Score
          </span>
          <HeroRing value={result.score} />
          <span className="rounded-full bg-brand-200 px-4 py-1 text-[12px] font-bold tracking-wide text-brand-900">
            {compliant ? "WCAG AA" : "Level AA"}
          </span>
        </div>

        <div className="flex flex-col gap-3">
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

          <div className="grid grid-cols-4 gap-2.5">
            {counts.map((c) => (
              <div
                key={c.label}
                className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3"
              >
                <span className="h-1 w-5 rounded-full" style={{ background: c.color }} />
                <span className="text-[27px] leading-none font-bold tracking-tight text-ink">
                  {c.value}
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-ink">{c.label}</div>
                  <div className="mt-px text-[9px] text-muted">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SectionKickerMuted>Executive Summary</SectionKickerMuted>
        <p className="mt-2 max-w-[6.7in] text-[13px] leading-normal text-ink-soft">
          {result.summary} The page passed{" "}
          <strong className="font-semibold text-ink">
            {result.counts.passed} automated checks
          </strong>
          {blockers > 0 ? (
            <>
              {" "}
              but {blockers} blocking issue{blockers > 1 ? "s" : ""} remain
              {blockers > 1 ? "" : "s"}. Resolving the priority fixes below would raise the score
              toward Level&nbsp;AA conformance.
            </>
          ) : (
            <> with no critical or serious blockers — a strong baseline.</>
          )}
        </p>
      </div>

      {fixes.length > 0 && (
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <SectionKicker>Priority Roadmap</SectionKicker>
              <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-ink">
                Top Priority Fixes
              </h2>
            </div>
            <span className="pb-0.5 text-[11px] text-muted">Ranked by impact ÷ effort</span>
          </div>

          <div className="mt-2.5 overflow-hidden rounded-2xl border border-line">
            {fixes.map((f, i) => (
              <div
                key={f.n}
                className={`grid grid-cols-[36px_1fr_92px] items-center gap-3.5 px-4 py-2.5 ${
                  i < fixes.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="text-[28px] leading-none font-bold text-brand-600">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{f.title}</span>
                    {f.criterion && (
                      <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-soft">
                        {f.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                    <span>
                      <b className="font-semibold text-ink">Effort</b> {f.effort}
                    </span>
                    <span className="text-line-strong">·</span>
                    <span>
                      <b className="font-semibold text-ink">Impact</b> {f.impact}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                    style={{
                      color: f.impact === "High" ? sevHex.critical : sevHex.serious,
                      background: f.impact === "High" ? sevTint.critical : sevTint.serious,
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
