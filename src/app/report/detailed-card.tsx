import type { ElementIdentity } from "@/lib/scan/dom/identity";
import type { ScanResult } from "@/lib/scan/types";
import { parseContrastFix } from "@/lib/report/contrast";
import { describeElement } from "@/lib/report/identity";
import { humanImpact } from "@/lib/report/guidance";
import { ruleTitle } from "@/lib/report/titles";
import { toFixStatus } from "@/lib/report/severity";
import { certifiedVerification, fixConfidenceOf } from "@/lib/scan/confidence";
import { ColorSwatch } from "@/components/ui";
import { NodeGlyph, Tag } from "@/components/investigation";
import { sevLabelKey } from "./shared";
import { FieldLabel } from "./primitives";
import type { Translate } from "@/lib/i18n/t";

export function DetailedCard({
  v,
  n,
  identity,
  t,
}: {
  v: ScanResult["violations"][number];
  n: number | null;
  identity?: ElementIdentity;
  t: Translate;
}) {
  const measurement = parseContrastFix(v.fix, v.fixCode);
  const status = toFixStatus(certifiedVerification(fixConfidenceOf(v), v.verification));
  const element = describeElement(v.where, identity, t);

  return (
    <div className="border border-hairline bg-surface">
      <div className="grid grid-cols-[1fr_1.7in]">
        <div className="border-r border-hairline p-4">
          <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
            <Tag n={n ?? "·"} sev={v.severity} size={22} />
            <div>
              <span className="block text-[15px] leading-snug font-semibold text-ink">
                {ruleTitle(v.id, t) ?? v.title}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-muted">
                <span className="font-semibold text-ink-2">{t(sevLabelKey[v.severity])}</span>
                {" · "}
                <span className="font-mono text-steel">
                  {v.criterion.replace(/^WCAG\s/, "").split(" · ")[0]}
                </span>
              </span>
            </div>
          </div>

          <p className="mt-2 text-[11.5px] leading-[1.45] text-body">{humanImpact(v.id, t)}</p>

          <div className="mt-2.5">
            <FieldLabel>{t("report.suggestedFix")}</FieldLabel>
            {measurement ? (
              <div className="mt-1 text-[11.5px] text-body">
                {t("report.measuredMinimum", {
                  measured: measurement.measured.toFixed(2),
                  required: measurement.required.toFixed(1),
                })}
                {measurement.fixed != null && measurement.toHex && (
                  <span className="mt-1.5 flex items-center gap-1.5">
                    {measurement.fromHex && (
                      <>
                        <ColorSwatch hex={measurement.fromHex} size={12} />
                        <span className="font-mono text-[10.5px] text-muted">
                          {measurement.fromHex.toUpperCase()}
                        </span>
                        <span aria-hidden className="text-muted">
                          →
                        </span>
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
              <code className="mt-1.5 block border border-hairline bg-code px-2 py-1.5 font-mono text-[10.5px] leading-normal whitespace-pre-wrap text-ink-2">
                {v.fixCode}
              </code>
            )}

            {status !== "unchecked" && (
              <>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
                  <NodeGlyph
                    kind="end"
                    sev={v.severity}
                    end={status === "verified" ? "tested" : "failed"}
                  />
                  {t(status === "verified" ? "chain.end.tested" : "chain.end.failed")}
                </p>
                <p className="mt-1 text-[9.5px] text-muted">{t("report.sandboxApplied")}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 bg-band p-3.5">
          <FieldLabel>{t("report.element")}</FieldLabel>
          <div className="-mt-1.5">
            <code className="block truncate bg-surface px-2 py-1 font-mono text-[10px] text-ink">
              {element.label}
            </code>
            {element.context && (
              <span className="mt-0.5 block px-2 text-[9.5px] text-muted">{element.context}</span>
            )}
          </div>
          <FieldLabel>{t("report.elementsAffected")}</FieldLabel>
          <span className="-mt-1.5 font-cond text-[20px] text-ink tabular-nums">{v.nodes}</span>
          <FieldLabel>{t("report.criterion")}</FieldLabel>
          <span className="-mt-1.5 text-[11px] text-body">{v.criterion}</span>
        </div>
      </div>
    </div>
  );
}
