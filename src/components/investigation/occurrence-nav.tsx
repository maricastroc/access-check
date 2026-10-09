import type { Translate } from "@/lib/i18n/t";
import { occurrenceTag, stepOccurrence } from "@/lib/report/occurrences";
import { cn } from "@/lib/cn";
import { Tag, type Sev } from "./notation";

const CHIPS_UP_TO = 8;

export function OccurrenceNav({
  n,
  labels,
  index,
  sev,
  onPick,
  t,
}: {
  n: number;
  labels: string[];
  index: number;
  sev: Sev;
  onPick: (index: number) => void;
  t: Translate;
}) {
  const total = labels.length;
  if (total <= 1) return null;

  if (total <= CHIPS_UP_TO) {
    return (
      <div
        role="group"
        aria-label={t("chain.occurrences")}
        className="mt-3 flex flex-wrap items-center gap-1.5"
      >
        {labels.map((label, i) => {
          const tag = occurrenceTag(n, i, total);
          return (
            <button
              key={`${tag}:${label}`}
              type="button"
              aria-pressed={i === index}
              aria-label={t("chain.occurrenceAria", { tag, label })}
              onClick={() => onPick(i)}
              className="ac-focus-tight flex min-h-6 min-w-6 cursor-pointer items-center justify-center"
            >
              <Tag n={tag} sev={sev} size={24} quiet={i !== index} selected={i === index} />
            </button>
          );
        })}
      </div>
    );
  }

  const button = cn(
    "inline-flex size-8 cursor-pointer items-center justify-center border border-border bg-surface text-ink hover:border-ink",
  );
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        aria-label={t("stepper.previous")}
        onClick={() => onPick(stepOccurrence(index, total, -1))}
        className={button}
      >
        <span aria-hidden>←</span>
      </button>
      <Tag n={occurrenceTag(n, index, total)} sev={sev} size={24} selected />
      <span aria-live="polite" className="text-[13px] text-muted tabular-nums">
        {t("stepper.position", { at: index + 1, total })}
        <span className="sr-only">
          , {occurrenceTag(n, index, total)}, {labels[index]}
        </span>
      </span>
      <button
        type="button"
        aria-label={t("stepper.next")}
        onClick={() => onPick(stepOccurrence(index, total, 1))}
        className={button}
      >
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
