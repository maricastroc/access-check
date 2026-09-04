"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

export function CopyableCode({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      //
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border border-hairline bg-code px-3 py-2",
        className,
      )}
    >
      <code className="overflow-x-auto font-mono text-[12.5px] leading-[1.7] whitespace-pre text-[#2b2b2d]">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className={cn(
          "shrink-0 cursor-pointer px-2 py-1 text-[11px] font-medium transition-colors",
          copied ? "text-verified" : "text-muted hover:bg-band hover:text-ink",
        )}
      >
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
        <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
