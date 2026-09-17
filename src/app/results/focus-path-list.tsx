import { useEffect } from "react";
import type { FocusStop } from "@/lib/scan/keyboard";
import type { Translate } from "@/lib/i18n/t";
import { scrollBehavior } from "@/lib/motion";

export function FocusPathList({
  stops,
  located,
  selected,
  onSelect,
  onStep,
  t,
}: {
  stops: FocusStop[];
  located: Set<number>;
  selected: number | null;
  onSelect: (n: number) => void;
  onStep: (delta: 1 | -1) => void;
  t: Translate;
}) {
  const position = selected === null ? null : stops.findIndex((s) => s.n === selected) + 1;

  useEffect(() => {
    if (selected === null) return;
    document
      .getElementById(`focus-stop-row-${selected}`)
      ?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, [selected]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="text-[12px] text-muted tabular-nums">
          {position === null
            ? t("focusPath.listTitle")
            : t("focusPath.selectedStop", { stop: position, total: stops.length })}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStep(-1)}
            className="flex size-6 cursor-pointer items-center justify-center border border-border font-cond text-[12px] text-ink hover:bg-band"
            title={t("focusPath.previousStop")}
          >
            <span aria-hidden>↑</span>
            <span className="sr-only">{t("focusPath.previousStop")}</span>
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            className="flex size-6 cursor-pointer items-center justify-center border border-border font-cond text-[12px] text-ink hover:bg-band"
            title={t("focusPath.nextStop")}
          >
            <span aria-hidden>↓</span>
            <span className="sr-only">{t("focusPath.nextStop")}</span>
          </button>
        </span>
      </div>

      <ol className="flex flex-col gap-0.5 text-[12.5px] text-body">
        {stops.map((s) => {
          const here = selected === s.n;
          const canLocate = located.has(s.n);

          return (
            <li key={s.n} id={`focus-stop-row-${s.n}`} className="scroll-mt-12">
              <button
                type="button"
                onClick={() => onSelect(s.n)}
                disabled={!canLocate}
                aria-current={here ? "true" : undefined}
                title={canLocate ? t("focusPath.goToStop", { stop: s.n }) : undefined}
                className={`flex w-full items-baseline gap-2 px-1.5 py-1 text-left ${
                  canLocate ? "cursor-pointer hover:bg-band" : "cursor-default"
                } ${here ? "bg-band outline-1 outline-ink" : ""}`}
              >
                <span className="font-cond text-muted tabular-nums">{s.n}</span>
                <span className="min-w-0 truncate">{s.label}</span>
                {!s.focusVisible && (
                  <span className="ml-auto shrink-0 text-[11px] text-critical">
                    {t("results.noVisibleFocus")}
                  </span>
                )}
                {s.focusVisible && !canLocate && (
                  <span className="ml-auto shrink-0 text-[11px] text-muted">
                    {t("focusPath.offCapture")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
