import type { ScanResult } from "@/lib/scan/types";
import type { FindingView } from "@/lib/report/findings";
import { reviewGuidance } from "@/lib/scan/review";
import { FindingDetail, FindingRow, SectionKicker } from "@/components/ui";

function Secondary({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="border-t border-hairline py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-body">
        <span aria-hidden className="ac-chev font-cond text-muted transition-transform">
          ▸
        </span>
        <span className="font-semibold text-ink tabular-nums">{count}</span>
        <span>{label}</span>
      </summary>
      <div className="mt-3 pl-5">{children}</div>
    </details>
  );
}

export function FindingsMargin({
  findings,
  result,
  host,
  selectedId,
  onSelect,
}: {
  findings: FindingView[];
  result: ScanResult;
  host: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const totalElements = findings.reduce((sum, f) => sum + f.elements, 0);
  const focusStops = result.keyboard?.focusPath ?? [];

  return (
    <section className="border-l border-border bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-3">
        <SectionKicker>Findings · by priority</SectionKicker>
        <span className="text-[12px] text-muted tabular-nums">
          {findings.length} finding{findings.length === 1 ? "" : "s"} · {totalElements} element
          {totalElements === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {findings.length === 0 ? (
          <p className="text-[13.5px] leading-normal text-body">
            <span className="font-semibold text-ink">No automated failures on this page.</span>{" "}
            {result.counts.passed} checks passed. This is not the same as WCAG conformance:{" "}
            {result.counts.manualReview} item{result.counts.manualReview === 1 ? "" : "s"} still
            need a person to review, listed below.
          </p>
        ) : (
          findings.map((f) => (
            <div key={f.id} id={`finding-${f.id}`} className="scroll-mt-24">
              <FindingRow
                finding={f}
                selected={f.id === selectedId}
                onSelect={() => onSelect(f.id)}
              />
              {f.id === selectedId && <FindingDetail finding={f} host={host} />}
            </div>
          ))
        )}
      </div>

      <div className="px-4 pb-4">
        <Secondary label="automated checks passed" count={result.counts.passed}>
          <ul className="flex flex-col gap-1.5 text-[12.5px] text-body">
            {result.passed.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-verified">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Secondary>

        <Secondary
          label="manual-review items, with how to check"
          count={result.counts.manualReview}
        >
          <ul className="flex flex-col gap-3">
            {result.incomplete.map((inc) => {
              const guide = reviewGuidance(inc.id);
              return (
                <li key={inc.id} className="border-l-2 border-hairline pl-3">
                  <p className="text-[13.5px] font-semibold text-ink">{inc.title}</p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-steel">{inc.criterion}</p>
                  <p className="mt-1 text-[12.5px] text-body">{guide.how}</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[12px] text-muted">
                    {guide.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>
        </Secondary>

        <Secondary label="focus-path stops" count={focusStops.length}>
          <ol className="flex flex-col gap-1 text-[12.5px] text-body">
            {focusStops.map((s) => (
              <li key={s.n} className="flex items-baseline gap-2">
                <span className="font-cond text-muted tabular-nums">{s.n}</span>
                <span className="min-w-0 truncate">{s.label}</span>
                {!s.focusVisible && (
                  <span className="ml-auto shrink-0 text-[11px] text-critical">
                    no visible focus
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Secondary>
      </div>
    </section>
  );
}
