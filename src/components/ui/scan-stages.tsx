import type { ScanPhase } from "@/lib/scan/types";
import { cn } from "@/lib/cn";

const STAGES = [
  "Opening the page and waiting for it to settle",
  "Running the WCAG A and AA checks (axe-core)",
  "Testing fixes on a copy of the page",
  "Taking the screenshot",
  "Keyboard and mobile checks",
] as const;

const PHASE_STAGE: Record<ScanPhase, number> = {
  preparing: 0,
  loading: 0,
  auditing: 1,
  processing: 2,
  finalizing: 3,
};

type StageState = "done" | "active" | "pending";

export function StageList({ stages, current }: { stages: readonly string[]; current: number }) {
  return (
    <ul className="w-full">
      {stages.map((label, i) => {
        const state: StageState = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2.5 py-2 text-[13px]",
              i > 0 && "border-t border-hairline",
              state === "done" && "text-body",
              state === "active" && "font-semibold text-ink",
              state === "pending" && "text-disabled",
            )}
          >
            <span aria-hidden className="w-3 text-center font-cond">
              {state === "done" ? (
                <span className="text-verified">✓</span>
              ) : state === "active" ? (
                <span className="text-ink">▸</span>
              ) : (
                <span className="text-disabled">·</span>
              )}
            </span>
            <span>
              {label}
              {state === "active" ? "…" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ScanStages({ phase }: { phase: ScanPhase }) {
  return <StageList stages={STAGES} current={PHASE_STAGE[phase]} />;
}
