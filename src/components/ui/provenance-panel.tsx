import { SectionKicker } from "./section-kicker";
import type { Translate } from "@/lib/i18n/t";

export function ProvenancePanel({
  viewport,
  durationMs,
  passes,
  t,
}: {
  viewport?: string;
  durationMs?: number;
  passes?: string;
  t: Translate;
}) {
  return (
    <div className="bg-band p-4">
      <SectionKicker tone="steel">{t("provenance.title")}</SectionKicker>
      <div className="mt-2 space-y-2 text-[12.5px] leading-normal text-body">
        <p>
          {t("provenance.engine")}
          {viewport ? t("provenance.viewportNote", { viewport }) : ""}
          {typeof durationMs === "number"
            ? viewport
              ? t("provenance.finishedIn", { seconds: (durationMs / 1000).toFixed(1) })
              : t("provenance.finishedInStandalone", { seconds: (durationMs / 1000).toFixed(1) })
            : ""}
          .
        </p>
        <p>{passes ?? t("provenance.complementary")}</p>
        <p>{t("provenance.sandboxNote")}</p>
      </div>
    </div>
  );
}
