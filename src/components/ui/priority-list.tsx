import type { ScoreBreakdown } from "@/lib/report/score";
import { severityLabel, severityTextVar } from "@/lib/report/severity";
import type { Translate } from "@/lib/i18n/t";

export function PriorityList({
  breakdown,
  t,
  size = "regular",
}: {
  breakdown: ScoreBreakdown;
  t: Translate;
  size?: "regular" | "compact";
}) {
  const text = size === "compact" ? "text-[11.5px]" : "text-[13.5px]";
  const dot = size === "compact" ? "h-2 w-2" : "h-2.5 w-2.5";

  if (breakdown.deductions.length === 0) {
    return <p className={`${text} text-muted`}>{t("priority.nothing")}</p>;
  }

  return (
    <ol className={size === "compact" ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      {breakdown.deductions.map((d) => (
        <li key={d.severity} className={`flex items-baseline gap-2 ${text}`}>
          <span
            aria-hidden
            className={`mt-1 inline-block shrink-0 ${dot}`}
            style={{ background: severityTextVar[d.severity] }}
          />
          <span className="leading-normal text-ink">
            <span className="font-semibold" style={{ color: severityTextVar[d.severity] }}>
              {d.issues} {severityLabel(d.severity, t).toLowerCase()}
            </span>{" "}
            <span className="text-muted">
              {t("priority.elements", { count: d.elements })} ·{" "}
              <span className="tabular-nums">{t("priority.share", { share: d.share })}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
