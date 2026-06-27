import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFire } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";

export function FixFirst({
  items,
  onViewFix,
}: {
  items: ScanResult["fixFirst"];
  onViewFix: (title: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-1 rounded-2xl border border-line bg-card px-5.5 py-5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FontAwesomeIcon icon={faFire} className="text-base text-serious" />
          <span className="text-base font-semibold tracking-tight">Fix First</span>
        </div>
        <span className="text-xs text-muted">Ordered by impact ÷ effort</span>
      </div>
      <p className="mb-1.5 text-[12.5px] leading-normal text-muted">
        Resolve these first for the biggest jump in your score.
      </p>
      {items.map((f) => (
        <div key={f.n} className="flex items-start gap-3.5 border-t border-line px-0.5 py-3.75">
          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-ink font-mono text-[13px] font-semibold text-white">
            {f.n}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-xs text-ink-soft">
                Effort <span className="font-mono font-semibold text-ink">{f.effort}</span>
              </span>
              <span className="h-2.75 w-px bg-line-strong" />
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                Impact
                <span
                  className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                    f.impact === "High"
                      ? "bg-brand-50 text-brand-500"
                      : f.impact === "Medium"
                        ? "bg-[#f0f1f4] text-ink-soft"
                        : "bg-[#f0f1f4] text-muted"
                  }`}
                >
                  {f.impact}
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={() => onViewFix(f.title)}
            className="h-7.5 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-card px-3 text-xs font-medium text-ink transition-colors hover:bg-[#f4f6f8]"
          >
            View fix
          </button>
        </div>
      ))}
    </div>
  );
}
