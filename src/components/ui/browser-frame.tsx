import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

type BrowserFrameProps = {
  url: string;
  secure?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  chromeClassName?: string;
};

export function BrowserFrame({
  url,
  secure = true,
  trailing,
  children,
  className,
  chromeClassName,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line bg-card shadow-card",
        className,
      )}
    >
      <div
        className={cn("flex items-center gap-3 border-b border-line px-5 py-3.5", chromeClassName)}
      >
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-canvas px-3 py-1.5 text-sm text-muted">
          {secure && <FontAwesomeIcon icon={faLock} className="text-xs" />}
          {url}
        </div>
        {trailing && <span className="text-sm font-medium text-muted">{trailing}</span>}
      </div>
      {children}
    </div>
  );
}
