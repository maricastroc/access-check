import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatusTone = "success" | "warning" | "critical" | "serious" | "moderate" | "brand";

const toneText: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  critical: "text-critical",
  serious: "text-serious",
  moderate: "text-moderate",
  brand: "text-brand-600",
};

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical",
  serious: "bg-serious",
  moderate: "bg-moderate",
  brand: "bg-brand-500",
};

type StatusPillProps = {
  children: ReactNode;
  tone: StatusTone;
  /** tamanho do ponto, default 1.5 (6px) */
  dotClassName?: string;
  className?: string;
};

/** Ponto colorido + rótulo (sem fundo) — ex. "Passed", "2 to fix". */
export function StatusPill({
  children,
  tone,
  dotClassName = "size-1.5",
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        toneText[tone],
        className,
      )}
    >
      <span className={cn("rounded-full", toneDot[tone], dotClassName)} />
      {children}
    </span>
  );
}
