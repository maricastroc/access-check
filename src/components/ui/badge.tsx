import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "brand" | "success" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "border-brand-100 bg-brand-50 text-brand-600",
  success: "border-transparent bg-[#e6f5ee] text-success",
  neutral: "border-line bg-card text-ink-soft",
};

const dotClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-500",
  success: "bg-success",
  neutral: "bg-faint",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
};

/** Pílula com texto (e ponto opcional) — selos tipo "WCAG 2.1", "WCAG AA". */
export function Badge({ children, tone = "neutral", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-2 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
