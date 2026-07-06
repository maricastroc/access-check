import type { ScanViolation } from "@/lib/scan/types";
import { CopyableCode } from "@/components/ui/copyable-code";
import { VerifyPill } from "./verify-pill";

export const MAX_SELECTORS = 5;

export function SectionHeader({
  dot,
  label,
  count,
  note,
}: {
  dot: string;
  label: string;
  count: number;
  note?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="text-[12.5px] font-semibold">{label}</span>
      <span className="font-mono text-[11.5px] text-faint">{count}</span>
      <span className="h-px flex-1 bg-line" />
      {note && <span className="text-[10.5px] text-muted">{note}</span>}
    </div>
  );
}

export function SelectorChips({
  selectors,
  total,
  className = "",
}: {
  selectors: string[];
  total: number;
  className?: string;
}) {
  if (selectors.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {selectors.map((sel, i) => (
        <span
          key={i}
          className="max-w-60 truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint"
        >
          {sel}
        </span>
      ))}
      {total > MAX_SELECTORS && (
        <span className="rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
          +{total - MAX_SELECTORS} more
        </span>
      )}
    </div>
  );
}

export function SuggestedFix({ item }: { item: ScanViolation }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2.75">
      <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
        Suggested fix
      </div>
      {item.fixGroups && item.fixGroups.length > 0 ? (
        item.fixGroups.map((fg, gi) => (
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
          {item.fix}
        </div>
      )}
    </div>
  );
}
