import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// `success`/`warning`/`brand` are legacy aliases kept so out-of-scope pages keep compiling.
export type StatusTone =
  | "verified"
  | "serious"
  | "moderate"
  | "critical"
  | "steel"
  | "muted"
  | "success"
  | "warning"
  | "brand";

const toneText: Record<StatusTone, string> = {
  verified: "text-verified",
  success: "text-verified",
  serious: "text-serious",
  moderate: "text-moderate-text",
  warning: "text-moderate-text",
  critical: "text-critical",
  steel: "text-steel",
  brand: "text-steel",
  muted: "text-muted",
};

const toneSquare: Record<StatusTone, string> = {
  verified: "bg-verified",
  success: "bg-verified",
  serious: "hatch-serious",
  moderate: "hatch-moderate",
  warning: "hatch-moderate",
  critical: "bg-critical",
  steel: "bg-steel",
  brand: "bg-steel",
  muted: "bg-muted",
};

type StatusPillProps = {
  children: ReactNode;
  tone: StatusTone;
  className?: string;
};

/** Inline status: a small square swatch (never color-only) + colored label. */
export function StatusPill({ children, tone, className }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] font-medium", toneText[tone], className)}>
      <span aria-hidden className={cn("size-2.5 shrink-0", toneSquare[tone])} />
      {children}
    </span>
  );
}
