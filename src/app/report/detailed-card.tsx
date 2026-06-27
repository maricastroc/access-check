import type { ScanResult } from "@/lib/scan/types";
import { sevHex, sevLabel, sevTint } from "./shared";
import { FieldLabel } from "./primitives";

type DetailedCardProps = {
  v: ScanResult["violations"][number];
};

export function DetailedCard({ v }: DetailedCardProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-card"
      style={{ borderColor: `${sevHex[v.severity]}40` }}
    >
      <div className="grid grid-cols-[1fr_1.7in]">
        <div className="border-r border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{v.title}</span>

            <span
              className="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase"
              style={{
                color: sevHex[v.severity],
                background: sevTint[v.severity],
                borderColor: `${sevHex[v.severity]}55`,
              }}
            >
              {sevLabel[v.severity]}
            </span>

            <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-soft">
              {v.criterion.split(" · ")[0]}
            </span>
          </div>

          <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-soft">{v.desc}</p>

          <div className="mt-2">
            <FieldLabel tone="brand">Suggested fix</FieldLabel>

            <div className="mt-0.5 font-mono text-[11px] leading-[1.45] whitespace-pre-line text-ink">
              {v.fix}
            </div>

            {v.fixCode && (
              <code className="mt-1.5 block rounded-md border border-line bg-[#f6f8fa] px-2 py-1.5 font-mono text-[10.5px] leading-normal whitespace-pre-wrap text-ink">
                {v.fixCode}
              </code>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 bg-[#fafbfc] p-3.5">
          <FieldLabel>Where</FieldLabel>

          <code className="-mt-1.5 truncate rounded-md bg-card px-2 py-1 font-mono text-[10px] text-ink-soft">
            {v.where}
          </code>

          <FieldLabel>Instances</FieldLabel>

          <span className="-mt-1.5 text-[20px] font-bold text-ink">{v.nodes}</span>

          <FieldLabel>Criterion</FieldLabel>

          <span className="-mt-1.5 text-[11px] text-ink-soft">{v.criterion}</span>
        </div>
      </div>
    </div>
  );
}
