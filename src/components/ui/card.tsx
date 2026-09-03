import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Selected/elevated panels get the single allowed shadow. */
  elevated?: boolean;
};

/** A straight-corner panel — no fill flourish, no rounded shadow card. */
export function Card({ elevated, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "border border-border bg-surface",
        elevated && "shadow-[var(--shadow-selected)]",
        className,
      )}
      {...rest}
    />
  );
}
