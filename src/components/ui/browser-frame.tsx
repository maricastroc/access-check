import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionKicker } from "./section-kicker";

type BrowserFrameProps = {
  /** Legend label shown at the top of the frame (condensed, uppercase). */
  label?: ReactNode;
  /** Legacy: render a URL chip instead of a legend label. */
  url?: string;
  secure?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Legacy no-op, kept for source compatibility. */
  chromeClassName?: string;
};

/**
 * The legend-barred frame that makes capture and diagnosis read as one
 * instrument: a straight-corner ink border with a hairline legend bar on top.
 */
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
