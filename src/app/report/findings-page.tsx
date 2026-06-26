import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { safeHost, sevHex, sevLabel, sevTint } from "./shared";
import {
  FieldLabel,
  GroupHeading,
  LegendChip,
  MiniHeader,
  PageShell,
  SectionKicker,
} from "./primitives";

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

      {/* legend */}
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
                  + {items.length - (sev === "critical" ? 3 : 2)} more {sevLabel[sev].toLowerCase()}{" "}
                  item
                  {items.length - (sev === "critical" ? 3 : 2) > 1 ? "s" : ""} in the full log
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
            <span className="text-[15px] font-semibold text-ink">{v.title}</span>
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
          <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-soft">{v.desc}</p>
          <div className="mt-2">
            <FieldLabel tone="brand">Suggested fix</FieldLabel>
            <div className="mt-0.5 font-mono text-[11px] leading-[1.45] whitespace-pre-line text-ink">
              {v.fix}
            </div>
            {v.fixCode && (
              <code className="mt-1.5 block rounded-md border border-line bg-[#f6f8fa] px-2 py-1.5 font-mono text-[10.5px] leading-normal whitespace-pre-wrap text-ink">
                {v.fixCode}
              </code>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 bg-[#fafbfc] p-3.5">
          <FieldLabel>Where</FieldLabel>
          <code className="-mt-1.5 truncate rounded-md bg-card px-2 py-1 font-mono text-[10px] text-ink-soft">
            {v.where}
          </code>
          <FieldLabel>Instances</FieldLabel>
          <span className="-mt-1.5 text-[20px] font-bold text-ink">{v.nodes}</span>
          <FieldLabel>Criterion</FieldLabel>
          <span className="-mt-1.5 text-[11px] text-ink-soft">{v.criterion}</span>
        </div>
      </div>
    </div>
  );
}
