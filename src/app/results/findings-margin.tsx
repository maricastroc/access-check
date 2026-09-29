import type { ScanResult } from "@/lib/scan/types";
import { FindingDetail, FindingRow } from "@/components/ui";
import { langAttrs } from "@/lib/i18n/locale";
import { FocusPathList } from "./focus-path-list";
import { focusPathLines } from "@/lib/report/focus-coverage";
import type { Translate } from "@/lib/i18n/t";
import { WorkQueue, type QueueGroups } from "./work-queue";

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
  groups,
  result,
  host,
  selectedId,
  onSelect,
  onOpenEvidence,
  selectedStop,
  onSelectStop,
  onStepStop,
  t,
}: {
  groups: QueueGroups;
  result: ScanResult;
  host: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenEvidence: (id: string) => void;
  selectedStop: number | null;
  onSelectStop: (n: number) => void;
  onStepStop: (delta: 1 | -1) => void;
  t: Translate;
}) {
  const focusStops = result.keyboard?.focusPath ?? [];
  const coverage = result.keyboard ? focusPathLines(result.keyboard, t) : { line: "", notes: [] };

  return (
    <section className="border-l border-border bg-surface">
      <div className="px-4 pt-1.5">
        <WorkQueue
          t={t}
          groups={groups}
          selectedId={selectedId}
          renderRow={(f) => (
            <div
              key={f.id}
              id={`finding-${f.id}`}
              className="scroll-mt-24"
              {...langAttrs(result.locale)}
            >
              <FindingRow
                t={t}
                finding={f}
                selected={f.id === selectedId}
                onSelect={() => onSelect(f.id)}
                markerNote={f.id !== selectedId}
              />
              {f.id === selectedId && (
                <FindingDetail
                  t={t}
                  finding={f}
                  host={host}
                  onOpenEvidence={() => onOpenEvidence(f.id)}
                />
              )}
            </div>
          )}
        />
      </div>

      <div className="px-4 pb-4">
        <Secondary label={t("results.focusPathStops")} count={focusStops.length}>
          <FocusPathList
            t={t}
            stops={focusStops}
            coverage={coverage}
            selected={selectedStop}
            onSelect={onSelectStop}
            onStep={onStepStop}
          />
        </Secondary>
      </div>
    </section>
  );
}
