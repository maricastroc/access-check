import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionKickerProps = {
  children: ReactNode;
  tone?: "muted" | "steel" | "ink";
  as?: "span" | "div" | "h2" | "h3" | "h4";
  className?: string;
  id?: string;
};

const toneClass = {
  muted: "text-muted",
  steel: "text-steel",
  ink: "text-ink",
} as const;

export function SectionKicker({
  children,
  tone = "muted",
  as: Tag = "span",
  className,
  id,
}: SectionKickerProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "font-cond text-[11px] font-medium tracking-[0.12em] uppercase",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
