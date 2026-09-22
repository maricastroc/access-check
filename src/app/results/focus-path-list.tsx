import { useEffect } from "react";
import type { FocusStop } from "@/lib/scan/keyboard";
import type { Translate } from "@/lib/i18n/t";
import { scrollBehavior } from "@/lib/motion";

export function FocusPathList({
  stops,
  coverage,
  selected,
  onSelect,
  onStep,
  t,
}: {
  stops: FocusStop[];
  coverage: { line: string; notes: string[] };
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

      <p className="pb-2 text-[12px] leading-normal text-muted">
        {coverage.line}
        {coverage.notes.map((note) => (
          <span key={note} className="mt-1 flex items-start gap-1.5 text-ink">
            <span aria-hidden className="mt-1.5 inline-block size-1 shrink-0 bg-moderate" />
            {note}
          </span>
        ))}
      </p>

      <ol className="flex flex-col gap-0.5 text-[12.5px] text-body">
        {stops.map((s) => {
          const here = selected === s.n;

          return (
            <li key={s.n} id={`focus-stop-row-${s.n}`} className="scroll-mt-12">
              <button
                type="button"
                onClick={() => onSelect(s.n)}
                aria-current={here ? "true" : undefined}
                title={t("focusPath.readStop", { stop: s.n })}
                className={`flex w-full cursor-pointer items-baseline gap-2 px-1.5 py-1 text-left hover:bg-band ${
                  here ? "bg-band outline-1 outline-ink" : ""
                }`}
              >
                <span className="font-cond text-muted tabular-nums">{s.n}</span>
                <span className="min-w-0 truncate">{s.label}</span>
                {!s.focusVisible && (
                  <span className="ml-auto shrink-0 text-[11px] text-critical">
                    {t("results.noVisibleFocus")}
                  </span>
                )}
                {s.focusIndicator === "shared" && (
                  <span className="ml-auto shrink-0 text-[11px] text-serious">
                    {t("results.focusOnContainer")}
                  </span>
                )}
                {s.rect?.scrolled && (
                  <span className="ml-auto shrink-0 text-[11px] text-muted">
                    {t("focusPath.insideScroller")}
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
