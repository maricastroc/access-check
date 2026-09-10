import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevLabelKey } from "./shared";
import { GroupHeading, LegendChip, MiniHeader, PageShell, SectionKicker } from "./primitives";
import { DetailedCard } from "./detailed-card";
import { translator } from "@/lib/i18n/t";

export function FindingsPage({ result }: { result: ScanResult }) {
  const t = translator(result.locale);
  const host = safeHost(result.finalUrl);
  const detailed: Severity[] = ["critical", "serious"];

  return (
    <PageShell t={t} page={2} host={host}>
      <MiniHeader t={t} host={host} />

      <div className="mt-5 border-b border-ink pb-2">
        <SectionKicker>{t("report.sectionTwo")}</SectionKicker>
        <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.015em] text-ink">
          {t("report.detailedFindings")}
        </h2>
        <p className="mt-1.5 max-w-xl text-[12px] leading-[1.45] text-muted">
          {t("report.findingsIntro")}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["critical", "serious", "moderate"] as Severity[]).map((s) => (
          <LegendChip t={t} key={s} sev={s} count={result.counts[s]} />
        ))}
        <span className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-ink">
          <span aria-hidden className="size-2.5 bg-verified" />
          {t("report.passedLabel")}{" "}
          <b className="font-medium text-muted tabular-nums">{result.counts.passed}</b>
        </span>
      </div>

      {detailed.map((sev) => {
        const limit = sev === "critical" ? 3 : 2;
        const items = result.violations.filter((v) => v.severity === sev);
        const hiddenCount = items.length - limit;
        if (items.length === 0) return null;

        return (
          <div key={sev} className="mt-4">
            <GroupHeading t={t} sev={sev} count={items.length} />
            <div className="mt-2.5 flex flex-col gap-2.5">
              {items.slice(0, limit).map((v, i) => (
                <DetailedCard t={t} key={`${v.id}-${i}`} v={v} />
              ))}
              {hiddenCount > 0 && (
                <p className="px-1 text-[10px] text-muted">
                  + {hiddenCount} more {t(sevLabelKey[sev]).toLowerCase()} finding
                  {hiddenCount > 1 ? "s" : ""} in the full report
                </p>
              )}
            </div>
          </div>
        );
      })}

      {result.counts.critical === 0 && result.counts.serious === 0 && (
        <div className="mt-5 border border-verified/40 bg-surface p-5 text-[13px] text-verified">
          <span aria-hidden className="mr-2 font-cond">
            ✓
          </span>
          {t("report.noSeriousOnPage")}
        </div>
      )}
    </PageShell>
  );
}
