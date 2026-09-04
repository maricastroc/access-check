import type { ScanResult } from "@/lib/scan/types";
import { scoreBreakdown } from "@/lib/report/score";
import { buildWcagReading } from "@/lib/report/wcag";
import { Ruler, ScoreArithmetic, WcagChips } from "@/components/ui";
import { safeHost, sevHex, shortId } from "./shared";
import { PageShell, SectionKicker, SectionKickerMuted } from "./primitives";

export function SummaryPage({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const breakdown = scoreBreakdown(result.violations, result.score);
  const wcag = buildWcagReading(result.violations);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const meta = [
    { label: "Audit date", value: date },
    { label: "Audit duration", value: `${(result.durationMs / 1000).toFixed(1)}s` },
    { label: "WCAG levels checked", value: "A & AA · 2.0 / 2.1 / 2.2" },
    { label: "Elements checked", value: String(result.scannedElements) },
  ];

  const counts: { label: string; value: number; color: string }[] = [
    { label: "Critical", value: result.counts.critical, color: sevHex.critical },
    { label: "Serious", value: result.counts.serious, color: sevHex.serious },
    { label: "Moderate", value: result.counts.moderate, color: sevHex.moderate },
    { label: "Passed", value: result.counts.passed, color: "#16764f" },
    { label: "Best practice", value: result.counts.bestPractice, color: "#3c5c7a" },
    { label: "Manual review", value: result.counts.manualReview, color: "#6b6c70" },
  ];

  const fixes = result.fixFirst.map((f) => {
    const v = result.violations.find((x) => x.title === f.title);
    return { ...f, criterion: v?.criterion };
  });

  return (
    <PageShell page={1} host={host}>
      <div className="flex items-start justify-between">
        <SectionKicker>Exported accessibility report</SectionKicker>
        <span className="font-mono text-[11px] text-muted">
          #AC-{new Date().getFullYear()}-{shortId(result.finalUrl)}
        </span>
      </div>

      <h1 className="mt-3 font-sans text-[38px] leading-[1.02] font-semibold tracking-[-0.02em] text-ink">
        Accessibility report
      </h1>
      <span className="mt-1 inline-block font-mono text-[14px] text-steel">{host}</span>

      <div className="mt-4 grid grid-cols-4 border border-hairline">
        {meta.map((m, i) => (
          <div key={m.label} className={`px-4 py-2.5 ${i > 0 ? "border-l border-hairline" : ""}`}>
            <div className="font-cond text-[9px] font-medium tracking-[0.12em] text-muted uppercase">
              {m.label}
            </div>
            <div className="mt-1 text-[13.5px] font-medium text-ink">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[2.5in_1fr] gap-4">
        <div className="border border-border p-4">
          <SectionKickerMuted>Internal priority score</SectionKickerMuted>
          <div className="mt-1 flex items-end gap-1.5">
            <span className="font-cond text-[52px] leading-[0.85] text-ink tabular-nums">
              {result.score}
            </span>
            <span className="pb-1.5 font-cond text-[16px] text-muted">/100</span>
          </div>
          <div className="mt-2">
            <Ruler
              variant="score"
              score={result.score}
              deductions={breakdown.deductions}
              height={22}
            />
          </div>
          <div className="mt-3">
            <WcagChips model={wcag} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-6 border border-hairline">
            {counts.map((c, i) => (
              <div key={c.label} className={`p-2.5 ${i > 0 ? "border-l border-hairline" : ""}`}>
                <span aria-hidden className="block h-1 w-5" style={{ background: c.color }} />
                <span className="mt-1.5 block font-cond text-[26px] leading-none text-ink tabular-nums">
                  {c.value}
                </span>
                <div className="mt-1 text-[9.5px] leading-tight text-muted">{c.label}</div>
              </div>
            ))}
          </div>
          <div className="border border-hairline p-3">
            <ScoreArithmetic
              breakdown={breakdown}
              passed={result.counts.passed}
              manualReview={result.counts.manualReview}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SectionKickerMuted>Executive summary</SectionKickerMuted>
        <p className="mt-2 max-w-[6.7in] text-[13px] leading-normal text-body">
          {result.summary} The page passed{" "}
          <strong className="font-semibold text-ink">
            {result.counts.passed} automated checks
          </strong>
          . The score is our own priority measure, not a pass or fail for WCAG. Meeting WCAG also
          depends on the {result.counts.manualReview} manual-review item
          {result.counts.manualReview === 1 ? "" : "s"} listed on page 3.
        </p>
      </div>

      {fixes.length > 0 && (
        <div className="mt-4">
          <div className="border-b border-ink pb-2">
            <SectionKicker>Priority roadmap</SectionKicker>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
              Fix first
            </h2>
          </div>
          <div className="mt-2 border border-hairline">
            {fixes.map((f, i) => (
              <div
                key={f.n}
                className={`grid grid-cols-[36px_1fr_92px] items-center gap-3 px-4 py-2.5 ${
                  i < fixes.length - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <span className="font-cond text-[26px] leading-none font-semibold text-serious tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{f.title}</span>
                    {f.criterion && (
                      <span className="border border-border bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] text-steel">
                        {f.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted">
                    Effort {f.effort} · Impact {f.impact}
                  </div>
                </div>
                <span
                  className="justify-self-end px-2 py-1 font-cond text-[11px] font-medium tracking-[0.06em] uppercase"
                  style={{ color: f.impact === "High" ? sevHex.critical : sevHex.serious }}
                >
                  {f.impact} impact
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
