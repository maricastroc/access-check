import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevLabel } from "./shared";

import { GroupHeading, LegendChip, MiniHeader, PageShell, SectionKicker } from "./primitives";
import { DetailedCard } from "./detailed-card";

export function FindingsPage({ result }: { result: ScanResult }) {
  const host = safeHost(result.finalUrl);
  const detailed: Severity[] = ["critical", "serious"];

  return (
    <PageShell page={2} host={host}>
      <MiniHeader host={host} />

      <div className="mt-5">
        <SectionKicker>Section 02</SectionKicker>
        <h2 className="mt-1.5 text-[30px] font-bold tracking-tight text-ink">Detailed Findings</h2>
        <p className="mt-1.5 max-w-xl text-[12px] leading-[1.45] text-muted">
          Every flagged issue grouped by severity and mapped to its WCAG&nbsp;2.1 success criterion,
          with the impact and a concrete fix for each.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["critical", "serious", "moderate"] as Severity[]).map((s) => (
          <LegendChip key={s} sev={s} count={result.counts[s]} />
        ))}

        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink">
          <span className="size-2 rounded-full bg-success" />
          Passed <b className="font-medium text-muted">{result.counts.passed}</b>
        </span>
      </div>

      {detailed.map((sev) => {
        const limit = sev === "critical" ? 3 : 2;
        const items = result.violations.filter((v) => v.severity === sev);
        const hiddenCount = items.length - limit;

        if (items.length === 0) return null;

        return (
          <div key={sev} className="mt-4">
            <GroupHeading sev={sev} count={items.length} />

            <div className="mt-2.5 flex flex-col gap-2.5">
              {items.slice(0, limit).map((v, i) => (
                <DetailedCard key={`${v.id}-${i}`} v={v} />
              ))}

              {hiddenCount > 0 && (
                <p className="px-1 text-[10px] text-muted">
                  + {hiddenCount} more {sevLabel[sev].toLowerCase()} item
                  {hiddenCount > 1 ? "s" : ""} in the full log
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
