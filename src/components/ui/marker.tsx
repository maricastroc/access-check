import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export type MarkerState = "idle" | "selected" | "unavailable";

type MarkerProps = {
  n: number;
  state: MarkerState;
  dimmed?: boolean; // belongs to a finding other than the selected one
  label?: string; // only shown when selected, e.g. "2.1:1 · needs 4.5:1"
  size?: number; // 28 desktop, 30 mobile
  ariaLabel: string;
  ariaPressed?: boolean;
  onSelect?: () => void;
};

export function Marker({
  n,
  state,
  dimmed = false,
  label,
  size = 28,
  ariaLabel,
  ariaPressed,
  onSelect,
}: MarkerProps) {
  const isChip = state === "selected" && Boolean(label);

  const style: CSSProperties = {
    height: size,
    minWidth: size,
    opacity: dimmed ? 0.45 : 1,
  };

  if (state === "selected") {
    style.background = "var(--color-ink)";
    style.color = "var(--color-surface)";
    style.border = "2px solid var(--color-surface)";
    style.boxShadow = "0 0 0 3px var(--color-ink), 0 4px 12px rgba(23,24,26,.4)";
    if (isChip) {
      style.paddingLeft = 8;
      style.paddingRight = 8;
      style.gap = 6;
    }
  } else if (state === "unavailable") {
    style.background = "rgba(252,251,248,.92)";
    style.color = "var(--color-muted)";
    style.border = "1px dashed var(--color-muted)";
  } else {
    style.background = "rgba(252,251,248,.92)";
    style.color = "var(--color-ink)";
    style.border = "1px dashed var(--color-ink)";
    style.boxShadow = "0 1px 3px rgba(23,24,26,.3)";
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onSelect}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-cond text-[15px] font-semibold tabular-nums",
        !onSelect && "cursor-default",
      )}
      style={style}
    >
      <span aria-hidden>{state === "unavailable" ? "–" : n}</span>
      {isChip && label && (
        <span className="font-sans text-[12px] font-medium whitespace-nowrap">{label}</span>
      )}
    </button>
  );
}
