import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionKicker } from "./section-kicker";

type BrowserFrameProps = {
  label?: ReactNode;
  url?: string;
  secure?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  chromeClassName?: string;
};

export function BrowserFrame({ label, url, trailing, children, className }: BrowserFrameProps) {
  return (
    <div className={cn("border border-ink bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2.5">
        {url !== undefined ? (
          <span className="truncate font-mono text-[12px] text-muted">{url}</span>
        ) : (
          <SectionKicker tone="muted">{label}</SectionKicker>
        )}
        {trailing}
      </div>
      {children}
    </div>
  );
}
