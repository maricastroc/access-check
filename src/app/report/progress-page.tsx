import { computeScore } from "@/lib/scan/derive";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevHex } from "./shared";
import { MiniHeader, PageShell, SectionKicker, SectionKickerMuted } from "./primitives";

export function ProgressPage({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const moderate = result.violations.filter((v) => v.severity === "moderate");

  // A priority what-if: the internal score if the critical + serious findings were cleared.
  const remaining = result.violations.filter(
    (v) => v.severity !== "critical" && v.severity !== "serious",
  );
  const estimated = Math.max(result.score, computeScore(remaining));
  const delta = estimated - result.score;

  const deltas = [
    { label: "Critical", from: result.counts.critical, to: 0, sev: "critical" as Severity },
    { label: "Serious", from: result.counts.serious, to: 0, sev: "serious" as Severity },
    { label: "Moderate", from: result.counts.moderate, to: result.counts.moderate, sev: "moderate" as Severity },
  ];

  const recs = [
    {
      color: sevHex.critical,
      term: "Immediate · 0–1 week",
      title: "Resolve critical findings",
      body: `Clear the ${result.counts.critical} critical finding${result.counts.critical === 1 ? "" : "s"} — they carry the heaviest priority weight.`,
    },
    {
      color: sevHex.serious,
      term: "Short term · 2–4 weeks",
      title: "Address serious findings",
      body: `Work through the ${result.counts.serious} serious finding${result.counts.serious === 1 ? "" : "s"} across templates and shared components.`,
    },
    {
      color: "var(--color-steel)",
      term: "Long term · 1–3 months",
      title: "Refine and re-audit",
      body: "Clear remaining moderate items, do the manual-review checks, and run the audit again.",
    },
  ];

  return (
    <PageShell page={3} host={host}>
      <MiniHeader host={host} />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="border border-hairline">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <span aria-hidden className="size-2.5 hatch-moderate" />
            <span className="text-[13px] font-semibold text-ink">Moderate</span>
            <span className="font-cond text-[11px] tracking-[0.06em] text-moderate-text uppercase tabular-nums">
              {result.counts.moderate} finding{result.counts.moderate === 1 ? "" : "s"}
            </span>
          </div>
          <div className="px-4 pt-1 pb-2">
            {moderate.slice(0, 4).map((v, i) => (
              <div
                key={`${v.id}-${i}`}
                className={`flex items-center justify-between py-2 ${
                  i < Math.min(moderate.length, 4) - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-[12px] font-semibold text-ink">{v.title}</div>
                  <div className="mt-px truncate text-[10px] text-muted">
                    {v.criterion.split(" · ")[1] ?? v.criterion}
                  </div>
                </div>
                <span className="shrink-0 border border-border bg-canvas px-1.5 py-1 font-mono text-[9px] text-steel">
                  {v.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                </span>
              </div>
            ))}
            {moderate.length > 4 && (
              <div className="py-2 text-[10px] text-muted">
                + {moderate.length - 4} more moderate finding{moderate.length - 4 > 1 ? "s" : ""}
              </div>
            )}
            {moderate.length === 0 && (
              <div className="py-3 text-[11px] text-muted">No moderate findings.</div>
            )}
          </div>
        </div>

        <div className="border border-hairline">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <span aria-hidden className="size-2.5 bg-verified" />
            <span className="text-[13px] font-semibold text-ink">Passed checks</span>
            <span className="font-cond text-[11px] tracking-[0.06em] text-verified uppercase tabular-nums">
              {result.counts.passed}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-4">
            {result.passed.slice(0, 10).map((p, i) => (
              <span key={`${p}-${i}`} className="flex items-start gap-1.5 text-[11px] text-body">
                <span aria-hidden className="mt-0.5 shrink-0 font-cond text-[10px] text-verified">
                  ✓
                </span>
                <span className="leading-snug wrap-break-word">{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border border-border p-5">
        <div className="border-b border-hairline pb-2">
          <SectionKicker>Priority projection</SectionKicker>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
            Where the score could go
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-[2.9in_1fr] items-center gap-6">
          <div className="flex items-center justify-between border border-hairline px-4 py-3.5">
            <div className="text-center">
              <SectionKickerMuted>Current</SectionKickerMuted>
              <div className="mt-1 font-cond text-[38px] leading-none tabular-nums text-muted">
                {result.score}
              </div>
            </div>
            <span className="font-cond text-[12px] font-medium text-verified tabular-nums">
              +{delta}
            </span>
            <div className="text-center">
              <SectionKicker>Estimated</SectionKicker>
              <div className="mt-1 font-cond text-[38px] leading-none tabular-nums text-ink">
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
                  <div className="flex h-2.5 flex-1 overflow-hidden border border-hairline bg-surface">
                    {d.from > 0 && (
                      <>
                        <span style={{ width: `${(resolved / d.from) * 100}%`, background: "var(--color-verified)" }} />
                        <span
                          className={d.sev === "moderate" ? "hatch-moderate" : d.sev === "serious" ? "hatch-serious" : "hatch-critical"}
                          style={{ width: `${(d.to / d.from) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-body tabular-nums">
                    {d.from} → {d.to}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-3.5 border-t border-hairline pt-3 text-[11px] leading-normal text-body">
          If the critical and serious findings were resolved, the internal priority score would rise
          to an estimated <b className="text-ink">{estimated} / 100</b>. This is a priority
          projection — not a statement of WCAG conformance, which also depends on moderate items and
          manual review.
        </p>
      </div>

      <div className="mt-5">
        <SectionKickerMuted>Action plan</SectionKickerMuted>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
          Recommendations
        </h2>
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {recs.map((r) => (
            <div key={r.term} className="border border-hairline p-4">
              <span aria-hidden className="inline-block h-1 w-6" style={{ background: r.color }} />
              <div className="mt-2.5 font-cond text-[9.5px] font-medium tracking-[0.12em] uppercase" style={{ color: r.color }}>
                {r.term}
              </div>
              <div className="mt-1.5 text-[14px] font-semibold text-ink">{r.title}</div>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-body">{r.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-[6.8in] text-[9.5px] leading-normal text-muted">
        The engine runs axe-core against WCAG A and AA (2.0/2.1/2.2). Automated testing covers a
        portion of the success criteria; the rest needs manual review with assistive technology.
        AAA is not evaluated, and this report is not a statement of conformance.
      </p>
    </PageShell>
  );
}
