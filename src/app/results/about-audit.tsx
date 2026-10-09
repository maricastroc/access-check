import type { ScanResult } from "@/lib/scan/types";
import { scoringIsCurrent } from "@/lib/report/standing";
import { StaleScoringNotice } from "./summary-band";
import { Button, ProvenancePanel, SectionKicker, WarningList } from "@/components/ui";
import { passedChecks } from "@/lib/report/titles";
import { useT } from "@/lib/i18n/provider";

export function AboutAudit({
  result,
  viewport,
  quickFromSite = false,
  onRerun,
}: {
  result: ScanResult;
  viewport?: string;
  quickFromSite?: boolean;
  onRerun: () => void;
}) {
  const t = useT();
  const warnings = result.warnings ?? [];
  const partial = result.partial || warnings.length > 0;
  const stale = !scoringIsCurrent(result);
  const state = [
    partial ? t("results.partialReport") : t("coverage.complete"),
    stale ? t("standing.staleTitle") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <details className="border-t border-border bg-canvas">
      <summary className="mx-auto flex w-full max-w-[1560px] cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3.5 sm:px-6">
        <span aria-hidden className="ac-chev text-muted" />
        <h2 className="shrink-0 text-[15px] font-semibold text-ink">{t("panel.aboutAudit")}</h2>
        <span className="text-[13.5px] text-muted">{state}</span>
      </summary>

      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-3">
        <section aria-labelledby="about-coverage">
          <SectionKicker as="h3" id="about-coverage">
            {t("panel.coverageLimitations")}
          </SectionKicker>
          {warnings.length > 0 ? (
            <div className="mt-2.5">
              <WarningList
                warnings={warnings}
                title={t("results.partialReport")}
                note={t("results.partialNote")}
              />
              <div className="mt-2">
                <Button variant="secondary" size="sm" onClick={onRerun}>
                  {t("results.runAgainMoreTime")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[13.5px] leading-normal text-body">{t("coverage.complete")}</p>
          )}
          {stale && (
            <div className="mt-3">
              <StaleScoringNotice t={t} />
            </div>
          )}
        </section>

        <section aria-labelledby="about-passed">
          <SectionKicker as="h3" id="about-passed">
            {result.counts.passed} {t("results.checksPassedLabel")}
          </SectionKicker>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-[12.5px] text-body">
            {passedChecks(result, t).map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-verified">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <ProvenancePanel
            t={t}
            viewport={viewport}
            durationMs={result.durationMs}
            passes={quickFromSite ? t("results.siteAuditPassNote") : undefined}
          />
        </section>
      </div>
    </details>
  );
}
