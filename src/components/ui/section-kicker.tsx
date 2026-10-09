import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionKickerProps = {
  children: ReactNode;
  tone?: "muted" | "steel" | "ink" | "band";
  variant?: "label" | "section";
  as?: "span" | "div" | "h2" | "h3" | "h4";
  className?: string;
  id?: string;
};

const toneClass = {
  muted: "text-muted",
  steel: "text-steel",
  ink: "text-ink",
  band: "text-band",
} as const;

export function SectionKicker({
  children,
  tone = "muted",
  variant = "label",
  as: Tag = "span",
  className,
  id,
}: SectionKickerProps) {
  return (
    <Tag
      id={id}
      className={cn(
        variant === "section"
          ? "font-cond text-[14px] font-semibold"
          : "font-cond text-[12.5px] font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
