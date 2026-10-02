import type { FindingView } from "@/lib/report/findings";
import type { Translate } from "@/lib/i18n/t";

export function ProblemNav({
  siblings,
  at,
  onGo,
  t,
}: {
  siblings: FindingView[];
  at: number;
  onGo: (id: string) => void;
  t: Translate;
}) {
  const previous = siblings[at - 1] ?? null;
  const next = siblings[at + 1] ?? null;
  if (!previous && !next) return null;

  return (
    <nav
      aria-label={t("panel.problemNavigation")}
      className="mt-5 flex flex-wrap items-center justify-between gap-3 pl-11 text-[13.5px]"
    >
      <button
        type="button"
        disabled={!previous}
        onClick={() => previous && onGo(previous.id)}
        className="flex min-h-8 cursor-pointer items-center gap-2 text-ink disabled:cursor-default disabled:text-disabled"
      >
        <span aria-hidden>←</span>
        {t("panel.previousProblem")}
      </button>
      <button
        type="button"
        disabled={!next}
        onClick={() => next && onGo(next.id)}
        className="flex min-h-8 cursor-pointer items-center gap-2 font-semibold text-ink disabled:cursor-default disabled:font-normal disabled:text-disabled"
      >
        {t("panel.nextProblem")}
        <span aria-hidden>→</span>
      </button>
    </nav>
  );
}
