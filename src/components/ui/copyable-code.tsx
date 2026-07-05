"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";

export function CopyableCode({ code }: { code: string }) {
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
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-line bg-[#0d1117] px-3 py-2">
      <code className="overflow-x-auto font-mono text-[12px] leading-relaxed whitespace-pre text-[#e6edf3]">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[#8b949e] transition-colors hover:bg-white/10 hover:text-white"
      >
        <FontAwesomeIcon
          icon={copied ? faCheck : faCopy}
          className={copied ? "text-success" : ""}
        />
        <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
