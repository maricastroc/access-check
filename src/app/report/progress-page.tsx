import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightLong, faCheck } from "@fortawesome/free-solid-svg-icons";
import { computeScore } from "@/lib/scan/derive";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevHex, sevTint } from "./shared";
import { MiniHeader, PageShell, SectionKicker, SectionKickerMuted } from "./primitives";

export function ProgressPage({ result }: { result: ScanResult }) {
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
                  i < Math.min(moderate.length, 4) - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-[12px] font-semibold text-ink">{v.title}</div>
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
              <div className="py-3 text-[11px] text-muted">No moderate issues found.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#cfe3dc] bg-[#f3f8f5]">
          <div className="flex items-center gap-2.5 border-b border-[#dceee3] px-4 py-3">
            <span className="size-2.5 rounded-[3px] bg-success" />
            <span className="text-[13px] font-semibold text-ink">Passed Checks</span>
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
                  className="mt-0.75 shrink-0 text-[10px] text-success"
                />
                <span className="leading-snug wrap-break-word">{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

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
              <FontAwesomeIcon icon={faArrowRightLong} className="text-brand-500" />
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
                  <span className="w-18.5 shrink-0 text-[11px] font-semibold text-ink">
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
            <div className="mt-0.5 flex items-center gap-4 pl-21.5 text-[10px] text-muted">
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

        <div className="mt-3.5 border-t border-[#cfe3dc] pt-3 text-[11px] leading-normal text-ink-soft">
          Resolving the critical and serious findings is projected to raise the score to an
          estimated <b className="text-brand-600">{estimated} / 100</b>, clearing every
          Level&nbsp;AA blocker.
        </div>
      </div>

      <div className="mt-5">
        <SectionKickerMuted>Action Plan</SectionKickerMuted>
        <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-ink">
          Final Recommendations
        </h2>
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {recs.map((r) => (
            <div key={r.term} className="rounded-2xl border border-line bg-card p-4">
              <span className="inline-block h-1 w-6 rounded-full" style={{ background: r.color }} />
              <div
                className="mt-2.5 text-[9px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: r.color }}
              >
                {r.term}
              </div>
              <div className="mt-1.5 text-[14px] font-semibold text-ink">{r.title}</div>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-soft">{r.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-[6.8in] text-[9.5px] leading-normal text-muted">
        This report reflects an automated scan against WCAG 2.2 Level&nbsp;AA. Automated testing
        covers roughly 40–57% of success criteria; manual review with assistive technology is
        recommended for full conformance certification.
      </p>
    </PageShell>
  );
}
