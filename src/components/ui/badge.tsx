import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "steel" | "verified" | "serious" | "moderate" | "brand" | "success";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface text-muted",
  steel: "border-border bg-surface text-steel",
  brand: "border-border bg-surface text-steel",
  verified: "border-verified/40 bg-surface text-verified",
  success: "border-verified/40 bg-surface text-verified",
  serious: "border-serious/40 bg-surface text-serious",
  moderate: "border-moderate/40 bg-surface text-moderate-text",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-muted",
  steel: "bg-steel",
  brand: "bg-steel",
  verified: "bg-verified",
  success: "bg-verified",
  serious: "bg-serious",
  moderate: "bg-moderate",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
};

export function Badge({ children, tone = "neutral", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[12.5px] font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5", dotClasses[tone])} />}
      {children}
    </span>
  );
}
