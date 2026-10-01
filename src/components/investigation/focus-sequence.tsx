import type { ReactNode } from "react";
import type { FocusStop } from "@/lib/scan/keyboard";
import type { Translate } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";
import { Tag } from "./notation";

export type RelatedFinding = { stop: number; tag: string; onOpen: () => void };

export function FocusSequence({
  stops,
  current,
  onPick,
  onStep,
  whole,
  onWhole,
  related = [],
  status,
  t,
  compact = false,
}: {
  stops: Pick<FocusStop, "n" | "label" | "focusVisible" | "focusIndicator" | "rect">[];
  current: number | null;
  onPick: (n: number) => void;
  onStep: (delta: 1 | -1) => void;
  whole: boolean;
  onWhole: (on: boolean) => void;
  related?: RelatedFinding[];
  status?: ReactNode;
  t: Translate;
  compact?: boolean;
}) {
  const at = stops.findIndex((s) => s.n === current);
  const here = at >= 0 ? stops[at] : null;
  const links = here ? related.filter((r) => r.stop === here.n) : [];

  return (
    <div className="ac-rise">
      <p className="text-[13.5px] text-muted">{t("focusPath.sequence", { count: stops.length })}</p>
      <ol className="mt-2.5 flex flex-wrap items-center gap-y-2.5">
        {stops.map((s, i) => {
          const now = s.n === current;
          return (
            <li key={s.n} className="flex items-center">
              {i > 0 && <span aria-hidden className="h-0.5 w-2.5 bg-path" />}
              <button
                type="button"
                aria-current={now ? "step" : undefined}
                aria-label={
                  s.focusVisible
                    ? t("marks.stopLabel", { n: s.n, label: s.label })
                    : t("marks.stopNoFocus", { n: s.n, label: s.label })
                }
                onClick={() => onPick(s.n)}
                className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center"
              >
                <span
                  data-sev="serious"
                  className={cn("flex rounded-full p-[3px]", !s.focusVisible && "ac-hatch")}
                >
                  <Tag
                    n={s.n}
                    sev="none"
                    shape="circle"
                    size={now ? 26 : 20}
                    quiet={!now}
                    selected={now}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label={t("panel.previousStop")}
            className="flex size-8 cursor-pointer items-center justify-center border border-border bg-surface text-[15px] hover:border-ink"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label={t("panel.nextStop")}
            className="flex size-8 cursor-pointer items-center justify-center border border-border bg-surface text-[15px] hover:border-ink"
          >
            <span aria-hidden>→</span>
          </button>
        </span>
        {here && (
          <p
            aria-live="polite"
            className={cn("min-w-0 text-ink", compact ? "text-[13.5px]" : "text-[14px]")}
          >
            <span className="font-semibold">
              {t("panel.stopOf", { at: at + 1, total: stops.length })}
            </span>
            {here.label && <span className="break-words text-ink-2"> · “{here.label}”</span>}
            {!here.focusVisible && (
              <span className="text-serious"> · {t("focusPath.stopNoFocus")}</span>
            )}
            {here.focusIndicator === "shared" && (
              <span className="text-serious"> · {t("results.focusOnContainer")}</span>
            )}
            {here.rect?.scrolled && (
              <span className="text-muted"> · {t("focusPath.insideScroller")}</span>
            )}
          </p>
        )}
      </div>

      {links.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2">
          {links.map((link) => (
            <button
              key={link.tag}
              type="button"
              onClick={link.onOpen}
              className="cursor-pointer text-[13.5px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              {t("focusPath.related", { tag: link.tag })}
            </button>
          ))}
        </p>
      )}

      {status && <div className="mt-2">{status}</div>}

      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[13.5px] text-ink-2">
        <input
          type="checkbox"
          checked={whole}
          onChange={(e) => onWhole(e.target.checked)}
          className="size-4 accent-ink"
        />
        {t("panel.showComplete")}
      </label>
    </div>
  );
}
