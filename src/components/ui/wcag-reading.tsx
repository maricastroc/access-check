import type { WcagReadingModel } from "@/lib/report/wcag";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

type Fill = "clean" | "fails" | "hollow";

function LevelSquare({ level, fill, size = 20 }: { level: string; fill: Fill; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-cond text-[11px] font-semibold",
        fill === "clean" && "bg-ink text-surface",
        fill === "fails" && "hatch-serious text-surface",
        fill === "hollow" && "border border-border text-muted",
      )}
      style={{ width: size, height: size }}
    >
      {level}
    </span>
  );
}

function criteriaList(criteria: { sc: string; name: string | null }[]): string {
  return criteria.map((c) => (c.name ? `${c.sc} ${c.name}` : c.sc)).join(", ");
}

export function WcagReading({ model, t }: { model: WcagReadingModel; t: Translate }) {
  const aFill: Fill = model.a.fails ? "fails" : "clean";
  const aaFill: Fill = model.aa.fails ? "fails" : "clean";

  return (
    <div className="border border-border bg-surface p-5">
      <ul>
        <li className="flex items-start gap-3 pb-3">
          <LevelSquare level="A" fill={aFill} />
          <p className="text-[14px] leading-snug text-body">
            {model.a.fails ? (
              <>
                {t("wcagReading.failsBy")}{" "}
                <span className="font-mono text-[12.5px] text-steel">
                  {criteriaList(model.a.criteria)}
                </span>
              </>
            ) : (
              t("wcagReading.noA")
            )}
          </p>
        </li>
        <li className="flex items-start gap-3 border-t border-hairline py-3">
          <LevelSquare level="AA" fill={aaFill} />
          <p className="text-[14px] leading-snug text-body">
            {model.aa.fails ? (
              <>
                {t("wcagReading.failsBy")}{" "}
                <span className="font-mono text-[12.5px] text-steel">
                  {criteriaList(model.aa.criteria)}
                </span>
              </>
            ) : (
              t("wcagReading.noAA")
            )}
          </p>
        </li>
        <li className="flex items-start gap-3 border-t border-hairline pt-3">
          <LevelSquare level="AAA" fill="hollow" />
          <p className="text-[14px] leading-snug text-muted">{t("wcagReading.notEvaluated")}</p>
        </li>
      </ul>
      <p className="mt-4 border-t border-hairline pt-3 text-[13px] leading-normal text-muted">
        {t("wcagReading.internalNote")}
      </p>
    </div>
  );
}

export function WcagChips({
  model,
  className,
  t,
}: {
  model: WcagReadingModel;
  className?: string;
  t: Translate;
}) {
  const chip = (level: string, fill: Fill, text: string) => (
    <span className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1.5">
      <LevelSquare level={level} fill={fill} size={16} />
      <span className="text-[12.5px] text-body">{text}</span>
    </span>
  );
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chip(
        "A",
        model.a.fails ? "fails" : "clean",
        model.a.fails
          ? t("chip.fails", { sc: model.a.criteria[0]?.sc ?? "" })
          : t("chip.noFailures"),
      )}
      {chip(
        "AA",
        model.aa.fails ? "fails" : "clean",
        model.aa.fails
          ? t("chip.fails", { sc: model.aa.criteria[0]?.sc ?? "" })
          : t("chip.noFailures"),
      )}
      {chip("AAA", "hollow", t("chip.notEvaluated"))}
    </div>
  );
}
