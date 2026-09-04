import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "border border-border bg-surface",
        elevated && "shadow-(--shadow-selected)",
        className,
      )}
      {...rest}
    />
  );
}
