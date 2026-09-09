import type { ReactNode } from "react";
import type { FixStatus } from "@/lib/report/severity";
import { cn } from "@/lib/cn";
import type { MessageKey, Translate } from "@/lib/i18n/t";

const DEFAULT_TEXT_KEY: Record<FixStatus, MessageKey> = {
  verified: "seal.verified",
  "needs-review": "seal.needsReview",
  unchecked: "seal.notReaudited",
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

export function StatusSeal({
  status,
  children,
  t,
}: {
  status: FixStatus;
  children?: ReactNode;
  t: Translate;
}) {
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
      <span>{children ?? t(DEFAULT_TEXT_KEY[status])}</span>
    </span>
  );
}
