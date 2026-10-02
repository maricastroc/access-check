import { SectionKicker } from "@/components/ui";
import type { Translate } from "@/lib/i18n/t";

export function StaleScoringNotice({ t }: { t: Translate }) {
  return (
    <div className="border border-dashed border-border bg-band px-3.5 py-3">
      <SectionKicker>{t("standing.staleTitle")}</SectionKicker>
      <p className="mt-1.5 text-[12.5px] leading-normal text-body">{t("standing.staleBody")}</p>
    </div>
  );
}

export function PendingStanding({ t, size }: { t: Translate; size: "lg" | "sm" }) {
  return (
    <>
      <p
        className={`font-cond leading-[1.05] text-muted ${size === "lg" ? "mt-1 text-[40px]" : "text-[30px]"}`}
      >
        {t("standing.pending")}
      </p>
      <p
        className={`max-w-[560px] leading-normal text-body ${size === "lg" ? "mt-1 text-[13.5px]" : "mt-0.5 text-[12.5px]"}`}
      >
        {t("standing.pendingNote")}
      </p>
    </>
  );
}
