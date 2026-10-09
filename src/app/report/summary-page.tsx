import type { Effort, ScanResult } from "@/lib/scan/types";
import { wcagReadingOf } from "@/lib/report/wcag";
import { WcagChips } from "@/components/ui";
import { StandingMark, Tag, sevOf } from "@/components/investigation";
import { standingOf, STANDING_LABEL, STANDING_NOTE } from "@/lib/report/standing";
import { findingsToFix, ruleIdOfTitle, safeHost, sevColor, shortId } from "./shared";
import { PageShell, SectionKicker, SectionKickerMuted } from "./primitives";
import { ruleTitle } from "@/lib/report/titles";
import { translator, type MessageKey } from "@/lib/i18n/t";

const EFFORT_KEY: Record<Effort, MessageKey> = {
  Quick: "report.effort.quick",
  Moderate: "report.effort.moderate",
  Involved: "report.effort.involved",
};

const IMPACT_KEY: Record<"High" | "Medium" | "Low", MessageKey> = {
  High: "report.impact.high",
  Medium: "report.impact.medium",
  Low: "report.impact.low",
};

export function SummaryPage({ result }: { result: ScanResult }) {
  const t = translator(result.locale);
  const host = safeHost(result.finalUrl);
  const wcag = wcagReadingOf(result);
  const standing = standingOf(result.counts);
  const at = result.scannedAt ? new Date(result.scannedAt) : new Date();
  const date = new Intl.DateTimeFormat(result.locale ?? "en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(at);

  const meta = [
    { label: t("report.auditDate"), value: date },
    { label: t("report.auditDuration"), value: `${(result.durationMs / 1000).toFixed(1)}s` },
    { label: t("report.wcagLevelsChecked"), value: t("report.levelsValue") },
    { label: t("report.elementsChecked"), value: String(result.scannedElements) },
  ];

  const counts: { label: string; value: number; color: string }[] = [
    { label: t("severity.critical"), value: result.counts.critical, color: sevColor.critical },
    { label: t("severity.serious"), value: result.counts.serious, color: sevColor.serious },
    { label: t("severity.moderate"), value: result.counts.moderate, color: sevColor.moderate },
    { label: t("report.passedLabel"), value: result.counts.passed, color: "var(--color-verified)" },
    {
      label: t("finding.kind.bestPractice"),
      value: result.counts.bestPractice,
      color: "var(--color-steel)",
    },
    {
      label: t("panel.count.manualReview"),
      value: result.counts.manualReview,
      color: "var(--color-review)",
    },
  ];

  const queue = findingsToFix(result);
  const fixes = result.fixFirst.map((f) => {
    const id = ruleIdOfTitle(result, f.title);
    const v = result.violations.find((x) => x.title === f.title);
    const view = queue.find((q) => (id ? q.ruleId === id : q.title === f.title)) ?? null;
    return {
      ...f,
      title: (id && ruleTitle(id, t)) ?? f.title,
      criterion: v?.criterion ?? (view?.criterionSc ? `WCAG ${view.criterionSc}` : undefined),
      view,
    };
  });

  return (
    <PageShell t={t} page={1} host={host}>
      <div className="flex items-start justify-between">
        <SectionKicker>{t("report.exportedTitle")}</SectionKicker>
        <span className="font-mono text-[11px] text-muted">
          #AC-{at.getFullYear()}-{shortId(result.finalUrl)}
        </span>
      </div>

      <h1 className="mt-3 font-sans text-[38px] leading-[1.02] font-semibold tracking-[-0.02em] text-ink">
        {t("report.accessibilityReport")}
      </h1>
      <span className="mt-1 inline-block font-mono text-[14px] text-steel">{host}</span>

      <div className="mt-4 grid grid-cols-4 border border-hairline">
        {meta.map((m, i) => (
          <div key={m.label} className={`px-4 py-2.5 ${i > 0 ? "border-l border-hairline" : ""}`}>
            <div className="font-cond text-[10.5px] font-semibold text-muted">{m.label}</div>
            <div className="mt-1 text-[13.5px] font-medium text-ink">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[2.5in_1fr] gap-4">
        <div className="border border-border p-4">
          <SectionKickerMuted>{t("standing.kicker")}</SectionKickerMuted>
          <p className="mt-2 flex items-center gap-2.5 text-[26px] leading-[1.05] font-bold tracking-[-0.02em] text-ink">
            <StandingMark standing={standing} size={18} />
            {t(STANDING_LABEL[standing])}
          </p>
          <p className="mt-1 text-[11.5px] leading-normal text-body">
            {t(STANDING_NOTE[standing])}
          </p>
          <div className="mt-3">
            <WcagChips t={t} model={wcag} />
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
            <SectionKickerMuted>{t("report.executiveSummary")}</SectionKickerMuted>
            <p className="mt-1.5 text-[12.5px] leading-normal text-body">
              {result.summary} {t("report.pagePassed")}{" "}
              <strong className="font-semibold text-ink">
                {result.counts.passed} {t("report.automatedChecks")}
              </strong>
              . {t("report.wcagDependsOn", { count: result.counts.manualReview })}
            </p>
          </div>
        </div>
      </div>

      {fixes.length > 0 && (
        <div className="mt-4">
          <div className="border-b border-ink pb-2">
            <SectionKicker>{t("report.priorityRoadmap")}</SectionKicker>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">
              {t("report.fixFirst")}
            </h2>
          </div>
          <div className="mt-2 border border-hairline">
            {fixes.map((f, i) => (
              <div
                key={f.n}
                className={`grid grid-cols-[auto_1fr] items-start gap-3 px-4 py-2.5 ${
                  i < fixes.length - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <Tag
                  n={f.view?.n ?? i + 1}
                  sev={f.view ? sevOf(f.view) : f.impact === "High" ? "critical" : "serious"}
                  size={22}
                />
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
                    {t("report.effortImpact", {
                      effort: t(EFFORT_KEY[f.effort]),
                      impact: t(IMPACT_KEY[f.impact]),
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
