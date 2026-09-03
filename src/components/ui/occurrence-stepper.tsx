import { cn } from "@/lib/cn";

/** ← [k of N] → across a finding's occurrences. Large targets on mobile. */
export function OccurrenceStepper({
  index,
  total,
  onPrev,
  onNext,
  size = "sm",
  className,
}: {
  index: number; // 0-based
  total: number;
  onPrev: () => void;
  onNext: () => void;
  size?: "sm" | "lg";
  className?: string;
}) {
  const btn = size === "lg" ? "size-11" : "size-[26px]";
  const counterWidth = size === "lg" ? "min-w-14" : "min-w-11";
  const disabled = total <= 1;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <button
        type="button"
        aria-label="Previous occurrence"
        onClick={onPrev}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center border border-border bg-canvas text-ink",
          "cursor-pointer hover:bg-band disabled:cursor-default disabled:text-disabled",
          btn,
        )}
      >
        <span aria-hidden>←</span>
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center font-cond text-[15px] font-medium tabular-nums text-ink",
          counterWidth,
        )}
      >
        {total === 0 ? "0 of 0" : `${index + 1} of ${total}`}
      </span>
      <button
        type="button"
        aria-label="Next occurrence"
        onClick={onNext}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center border border-border bg-canvas text-ink",
          "cursor-pointer hover:bg-band disabled:cursor-default disabled:text-disabled",
          btn,
        )}
      >
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
