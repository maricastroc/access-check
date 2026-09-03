import type { ReactNode } from "react";
import type { FixStatus } from "@/lib/report/severity";
import { cn } from "@/lib/cn";

const DEFAULT_TEXT: Record<FixStatus, string> = {
  verified: "Verified — the rule stopped flagging the element",
  "needs-review": "Needs review — the suggestion alone doesn't clear it",
  unchecked: "Not re-audited",
};

const GLYPH: Record<FixStatus, string> = {
  verified: "✓",
  "needs-review": "?",
  unchecked: "·",
};

const CLS: Record<FixStatus, string> = {
  verified: "border border-solid border-verified bg-verified/[0.08] text-verified",
  "needs-review": "border border-dashed border-moderate text-moderate-text",
  unchecked: "border border-dashed border-border text-muted",
};

/** The status of a sandbox re-audit. Always carries text — never glyph-only. */
export function StatusSeal({ status, children }: { status: FixStatus; children?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] leading-tight",
        CLS[status],
      )}
    >
      <span aria-hidden className="font-cond text-[13px]">
        {GLYPH[status]}
      </span>
      <span>{children ?? DEFAULT_TEXT[status]}</span>
    </span>
  );
}
