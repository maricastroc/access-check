import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** sombra mais forte (usada em cartões de destaque) */
  elevated?: boolean;
};

/** Container branco arredondado com borda — base de quase tudo. */
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
