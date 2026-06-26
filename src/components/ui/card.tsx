import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-card",
        elevated ? "shadow-card" : "shadow-soft",
        className,
      )}
      {...rest}
    />
  );
}
