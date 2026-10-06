import type { ReactNode } from "react";
import type { FocusStop } from "@/lib/scan/keyboard";
import type { Translate } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";
import { RING, Tag, type Sev } from "./notation";

export type RelatedFinding = { stop: number; tag: string; sev: Sev; onOpen: () => void };

const LONG = 24;
const AROUND = 6;

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
  const centre = Math.max(at, 0);
  const listed =
    whole || stops.length <= LONG
      ? stops.map((s, i) => ({ s, i }))
      : stops
          .map((s, i) => ({ s, i }))
          .filter(({ i }) => i === 0 || i === stops.length - 1 || Math.abs(i - centre) <= AROUND);

  return (
    <div className="ac-rise">
      <p className="text-[13.5px] text-muted">{t("focusPath.sequence", { count: stops.length })}</p>
      <ol className="mt-2.5 flex flex-wrap items-center gap-y-2.5">
        {listed.map(({ s, i }, k) => {
          const now = s.n === current;
          const gap = k > 0 && i - listed[k - 1].i > 1;
          const alert = related.find((r) => r.stop === s.n);
          const name = s.focusVisible
            ? t("marks.stopLabel", { n: s.n, label: s.label })
            : t("marks.stopNoFocus", { n: s.n, label: s.label });
          return (
            <li key={s.n} className="flex items-center">
              {gap && (
                <span aria-hidden className="px-1.5 text-[13px] text-muted">
                  …
                </span>
              )}
              {k > 0 && !gap && <span aria-hidden className="h-0.5 w-2.5 bg-path" />}
              <button
                type="button"
                data-stop={s.n}
                aria-current={now ? "step" : undefined}
                aria-label={
                  alert ? t("marks.stopWithFinding", { stop: name, tag: alert.tag }) : name
                }
                onClick={() => onPick(s.n)}
                className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center"
              >
                <span
                  data-sev={alert?.sev}
                  data-alert={alert ? "true" : undefined}
                  className={cn("flex rounded-full p-[3px]", alert && "ac-hatch")}
                  style={now && alert ? { boxShadow: RING } : undefined}
                >
                  <Tag
                    n={s.n}
                    sev="none"
                    shape="circle"
                    size={now ? 26 : 20}
                    quiet={!now}
                    selected={now && !alert}
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
              <span className="text-serious-text"> · {t("focusPath.stopNoFocus")}</span>
            )}
            {here.focusIndicator === "shared" && (
              <span className="text-serious-text"> · {t("results.focusOnContainer")}</span>
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
