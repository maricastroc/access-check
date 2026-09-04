import type { ScanResult } from "@/lib/scan/types";
import { parseContrastFix } from "@/lib/report/contrast";
import { toFixStatus } from "@/lib/report/severity";
import { ColorSwatch, StatusSeal } from "@/components/ui";
import { sevHex, sevLabel } from "./shared";
import { FieldLabel } from "./primitives";

export function DetailedCard({ v }: { v: ScanResult["violations"][number] }) {
  const measurement = parseContrastFix(v.fix, v.fixCode);
  const status = toFixStatus(v.verification);

  return (
    <div className="border border-hairline bg-surface" style={{ borderLeft: `3px solid ${sevHex[v.severity]}` }}>
      <div className="grid grid-cols-[1fr_1.7in]">
        <div className="border-r border-hairline p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{v.title}</span>
            <span
              className="font-cond px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase"
              style={{ color: sevHex[v.severity] }}
            >
              {sevLabel[v.severity]}
            </span>
            <span className="border border-border bg-canvas px-1.5 py-0.5 font-mono text-[9.5px] text-steel">
              {v.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
            </span>
          </div>

          <p className="mt-2 text-[11.5px] leading-[1.45] text-body">{v.desc}</p>

          <div className="mt-2.5">
            <FieldLabel>Suggested fix</FieldLabel>
            {measurement ? (
              <div className="mt-1 text-[11.5px] text-body">
                Measured {measurement.measured.toFixed(2)}:1 · minimum AA{" "}
                {measurement.required.toFixed(1)}:1
                {measurement.fixed != null && measurement.toHex && (
                  <span className="mt-1.5 flex items-center gap-1.5">
                    {measurement.fromHex && (
                      <>
                        <ColorSwatch hex={measurement.fromHex} size={12} />
                        <span className="font-mono text-[10.5px] text-muted">
                          {measurement.fromHex.toUpperCase()}
                        </span>
                        <span aria-hidden className="text-muted">→</span>
                      </>
                    )}
                    <ColorSwatch hex={measurement.toHex} size={12} />
                    <span className="font-mono text-[10.5px] text-ink">
                      {measurement.toHex.toUpperCase()}
                    </span>
                    <span className="text-muted">→ {measurement.fixed.toFixed(2)}:1</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-[11px] leading-[1.45] text-body">{v.fix}</div>
            )}

            {v.fixCode && (
              <code className="mt-1.5 block border border-hairline bg-code px-2 py-1.5 font-mono text-[10.5px] leading-normal whitespace-pre-wrap text-[#2b2b2d]">
                {v.fixCode}
              </code>
            )}

            <div className="mt-2">
              <StatusSeal status={status} />
            </div>
            <p className="mt-1.5 text-[9.5px] text-muted">
              Applied and re-checked on a copy of the page. The audited site was not altered.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 bg-band p-3.5">
          <FieldLabel>Selector</FieldLabel>
          <code className="-mt-1.5 truncate bg-surface px-2 py-1 font-mono text-[10px] text-steel">
            {v.where}
          </code>
          <FieldLabel>Elements affected</FieldLabel>
          <span className="-mt-1.5 font-cond text-[20px] tabular-nums text-ink">{v.nodes}</span>
          <FieldLabel>Criterion</FieldLabel>
          <span className="-mt-1.5 text-[11px] text-body">{v.criterion}</span>
        </div>
      </div>
    </div>
  );
}
