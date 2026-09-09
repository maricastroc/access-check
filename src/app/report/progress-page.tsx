import { computeScore } from "@/lib/scan/derive";
import { violationsBehindScore } from "@/lib/scan/scored";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevHex } from "./shared";
import { MiniHeader, PageShell, SectionKicker, SectionKickerMuted } from "./primitives";
import { translator } from "@/lib/i18n/t";

export function ProgressPage({ result }: { result: ScanResult }) {
  const t = translator(result.locale);
  const host = safeHost(result.finalUrl);
  const scored = violationsBehindScore(result);
  const moderate = scored.filter((v) => v.severity === "moderate");

  const remaining = scored.filter((v) => v.severity !== "critical" && v.severity !== "serious");
  const estimated = Math.max(result.score, computeScore(remaining));
  const delta = estimated - result.score;

  const deltas = [
    { label: "Critical", from: result.counts.critical, to: 0, sev: "critical" as Severity },
    { label: "Serious", from: result.counts.serious, to: 0, sev: "serious" as Severity },
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
      term: t("report.roadmap.immediateTerm"),
      title: t("report.roadmap.immediateTitle"),
      body: t("report.roadmap.immediateBody", { count: result.counts.critical }),
    },
    {
      color: sevHex.serious,
      term: t("report.roadmap.shortTerm"),
      title: t("report.roadmap.shortTitle"),
      body: t("report.roadmap.shortBody", { count: result.counts.serious }),
    },
    {
      color: "var(--color-steel)",
      term: t("report.roadmap.longTerm"),
      title: t("report.roadmap.longTitle"),
      body: t("report.roadmap.longBody"),
    },
  ];

  return (
    <PageShell t={t} page={3} host={host}>
      <MiniHeader t={t} host={host} />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="border border-hairline">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <span aria-hidden className="hatch-moderate size-2.5" />
            <span className="text-[13px] font-semibold text-ink">{t("severity.moderate")}</span>
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
              <div className="py-3 text-[11px] text-muted">{t("report.noModerate")}</div>
            )}
          </div>
        </div>

        <div className="border border-hairline">
          <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
            <span aria-hidden className="size-2.5 bg-verified" />
            <span className="text-[13px] font-semibold text-ink">{t("report.passedChecks")}</span>
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
          <SectionKicker>{t("report.priorityProjection")}</SectionKicker>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
            {t("report.whereScoreCouldGo")}
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-[2.9in_1fr] items-center gap-6">
          <div className="flex items-center justify-between border border-hairline px-4 py-3.5">
            <div className="text-center">
              <SectionKickerMuted>{t("report.current")}</SectionKickerMuted>
              <div className="mt-1 font-cond text-[38px] leading-none text-muted tabular-nums">
                {result.score}
              </div>
            </div>
            <span className="font-cond text-[12px] font-medium text-verified tabular-nums">
              +{delta}
            </span>
            <div className="text-center">
              <SectionKicker>{t("report.estimated")}</SectionKicker>
              <div className="mt-1 font-cond text-[38px] leading-none text-ink tabular-nums">
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
                  <div className="flex h-2.5 flex-1 overflow-hidden border border-hairline bg-surface">
                    {d.from > 0 && (
                      <>
                        <span
                          style={{
                            width: `${(resolved / d.from) * 100}%`,
                            background: "var(--color-verified)",
                          }}
                        />
                        <span
                          className={
                            d.sev === "moderate"
                              ? "hatch-moderate"
                              : d.sev === "serious"
                                ? "hatch-serious"
                                : "hatch-critical"
                          }
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
          {t("report.projectionBody")} <b className="text-ink">{estimated} / 100</b>
          {t("report.projectionCaveat")}
        </p>
      </div>

      <div className="mt-5">
        <SectionKickerMuted>{t("report.actionPlan")}</SectionKickerMuted>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
          {t("report.recommendations")}
        </h2>
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          {recs.map((r) => (
            <div key={r.term} className="border border-hairline p-4">
              <span aria-hidden className="inline-block h-1 w-6" style={{ background: r.color }} />
              <div
                className="mt-2.5 font-cond text-[9.5px] font-medium tracking-[0.12em] uppercase"
                style={{ color: r.color }}
              >
                {r.term}
              </div>
              <div className="mt-1.5 text-[14px] font-semibold text-ink">{r.title}</div>
              <p className="mt-1.5 text-[11.5px] leading-[1.55] text-body">{r.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-[6.8in] text-[9.5px] leading-normal text-muted">
        {t("report.wcagDisclaimer")}
      </p>
    </PageShell>
  );
}
