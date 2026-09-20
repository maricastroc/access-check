import { verdictLabel, verdictTone, type Verdict } from "@/lib/report/verdict";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

const TONE = {
  verified: {
    cls: "border-solid border-verified bg-verified/[0.08] text-verified",
    glyph: "✓",
  },
  attention: { cls: "border-dashed border-moderate text-moderate-text", glyph: "?" },
};

export function VerdictSeal({ verdict, t }: { verdict: Verdict; t: Translate }) {
  const tone = verdictTone(verdict);
  if (tone === "quiet") return null;

  const style = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1.5 text-[12.5px] leading-tight",
        style.cls,
      )}
    >
      <span aria-hidden className="font-cond text-[13px]">
        {style.glyph}
      </span>
      {verdictLabel(verdict, t)}
    </span>
  );
}
