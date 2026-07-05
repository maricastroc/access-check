import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult, Severity } from "@/lib/scan/types";
import { reviewGuidance } from "@/lib/scan/review";
import { CopyableCode } from "@/components/ui/copyable-code";
import { sevDot, severityLabel, severityOrder } from "./data";
import { fixDomId, type FilterKey } from "./shared";
import { VerifyPill } from "./verify-pill";
import { IssueCard } from "./issue-card";

const MAX_SELECTORS = 5;

export function ViolationsList({
  result,
  filter,
  setFilter,
}: {
  result: ScanResult;
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
}) {
  const { counts } = result;

  const groups = severityOrder
    .map((sev) => ({
      sev,
      items: result.violations.filter((v) => v.severity === sev),
    }))
    .filter((g) => g.items.length > 0);

  const visibleGroups =
    filter === "all" || filter === "passed"
      ? filter === "passed"
        ? []
        : groups
      : groups.filter((g) => g.sev === filter);

  const showPassed = filter === "all" || filter === "passed";

  const totalElements = result.violations.reduce((sum, v) => sum + v.nodes, 0);

  const tabs: {
    key: FilterKey;
    label: string;
    count: number;
    dot: string | null;
  }[] = [
    { key: "all", label: "All", count: result.violations.length, dot: null },
    ...severityOrder
      .filter((s) => counts[s] > 0)
      .map((s) => ({
        key: s,
        label: severityLabel[s],
        count: counts[s],
        dot: sevDot[s],
      })),
    { key: "passed", label: "Passed", count: counts.passed, dot: "bg-success" },
  ];

  const filterCountLabel =
    filter === "all"
      ? `${result.violations.length} issue${result.violations.length === 1 ? "" : "s"} across ${groups.length} level${groups.length === 1 ? "" : "s"} — ${totalElements} element${totalElements === 1 ? "" : "s"} affected`
      : filter === "passed"
        ? `${counts.passed} checks passed`
        : `${counts[filter as Severity]} ${filter} issue${counts[filter as Severity] === 1 ? "" : "s"}`;

  return (
    <div className="mt-1">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-base font-semibold tracking-tight">WCAG Violations</span>
        <span className="text-xs text-muted">{filterCountLabel}</span>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1.75">
        {tabs.map((t) => {
          const active = t.key === filter;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`inline-flex cursor-pointer items-center gap-1.75 rounded-[9px] border px-2.75 py-1.5 text-[12.5px] transition-colors ${
                active
                  ? "border-ink bg-ink font-semibold text-white"
                  : "border-line-strong bg-card font-medium text-ink-soft hover:border-line-hover"
              }`}
            >
              {t.dot && <span className={`size-1.75 rounded-full ${t.dot}`} />}
              {t.label}
              <span className={`font-mono text-[11px] ${active ? "text-white/65" : "text-faint"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleGroups.map((g) => (
        <div key={g.sev} className="mb-4.5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className={`size-2 rounded-full ${sevDot[g.sev]}`} />
            <span className="text-[12.5px] font-semibold">{severityLabel[g.sev]}</span>
            <span className="font-mono text-[11.5px] text-faint">{g.items.length}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {g.items.map((it, i) => (
            <IssueCard
              key={`${it.id}-${i}`}
              dot={sevDot[g.sev]}
              title={it.title}
              subtitle={it.criterion}
              nodes={it.nodes}
              where={it.where}
              anchorId={fixDomId(it.title)}
            >
              <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft">{it.desc}</p>
              <div className="rounded-[10px] border border-line bg-surface px-3 py-2.75">
                <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
                  Suggested fix
                </div>
                {it.fixGroups && it.fixGroups.length > 0 ? (
                  it.fixGroups.map((fg, gi) => (
                    <div key={gi} className={gi > 0 ? "mt-3 border-t border-line pt-3" : ""}>
                      <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-line text-ink">
                        {fg.text}
                      </div>
                      {fg.code && <CopyableCode code={fg.code} />}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {fg.count > 1 && (
                          <span className="inline-flex items-center rounded-md bg-chip px-1.5 py-0.5 text-[10.5px] font-semibold text-muted">
                            Resolves {fg.count} elements
                          </span>
                        )}
                        <VerifyPill v={fg.verification} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-line text-ink">
                    {it.fix}
                  </div>
                )}
              </div>
            </IssueCard>
          ))}
        </div>
      ))}

      {showPassed && result.passed.length > 0 && (
        <div className="rounded-xl border border-line bg-card px-4 pt-4 pb-4.25">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <span className="text-[12.5px] font-semibold">Passed</span>
            <span className="font-mono text-[11.5px] text-faint">{result.passed.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.75">
            {result.passed.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#dceee3] bg-[#eef7f1] px-2.5 py-1 text-[11.5px] text-success-fg"
              >
                <FontAwesomeIcon icon={faCheck} className="text-[10px] text-success" />
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.bestPractice.length > 0 && (
        <div className="mt-5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand-400" />
            <span className="text-[12.5px] font-semibold">Best practices</span>
            <span className="font-mono text-[11.5px] text-faint">{result.bestPractice.length}</span>
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] text-muted">Recommended — not WCAG violations</span>
          </div>
          {result.bestPractice.map((bp, i) => (
            <IssueCard
              key={`bp-${bp.id}-${i}`}
              dot="bg-brand-400"
              title={bp.title}
              subtitle={bp.id}
              nodes={bp.nodes}
            >
              <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft">{bp.desc}</p>
              {bp.selectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bp.selectors.map((sel, si) => (
                    <span
                      key={si}
                      className="max-w-60 truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint"
                    >
                      {sel}
                    </span>
                  ))}
                  {bp.nodes > MAX_SELECTORS && (
                    <span className="rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
                      +{bp.nodes - MAX_SELECTORS} more
                    </span>
                  )}
                </div>
              )}
            </IssueCard>
          ))}
        </div>
      )}

      {result.incomplete.length > 0 && (
        <div className="mt-5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-moderate" />
            <span className="text-[12.5px] font-semibold">Needs manual review</span>
            <span className="font-mono text-[11.5px] text-faint">{result.incomplete.length}</span>
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] text-muted">
              Automated testing couldn&apos;t determine these
            </span>
          </div>
          {result.incomplete.map((inc, i) => {
            const guide = reviewGuidance(inc.id);
            return (
              <IssueCard
                key={`inc-${inc.id}-${i}`}
                dot="bg-moderate"
                title={inc.title}
                subtitle={inc.criterion}
                nodes={inc.nodes}
              >
                <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-soft">{inc.desc}</p>
                {inc.selectors.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {inc.selectors.map((sel, si) => (
                      <span
                        key={si}
                        className="max-w-60 truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint"
                      >
                        {sel}
                      </span>
                    ))}
                    {inc.nodes > MAX_SELECTORS && (
                      <span className="rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
                        +{inc.nodes - MAX_SELECTORS} more
                      </span>
                    )}
                  </div>
                )}
                <div className="rounded-[9px] border border-warning-border bg-warning-surface px-3 py-2.5 text-[11.5px] leading-relaxed text-warning-fg">
                  <p className="font-semibold">How to check</p>
                  <p className="mt-0.5">{guide.how}</p>
                  <ol className="mt-1.5 flex list-decimal flex-col gap-1 pl-4 marker:font-semibold marker:text-warning-fg/70">
                    {guide.steps.map((step, si) => (
                      <li key={si}>{step}</li>
                    ))}
                  </ol>
                </div>
              </IssueCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
