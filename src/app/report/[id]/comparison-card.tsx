import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faCheck,
  faMinus,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { ScanDiff, ViolationRef } from "@/lib/scan/diff";
import type { Severity } from "@/lib/scan/types";
import { sevHex, sevLabelKey } from "../shared";
import type { Translate } from "@/lib/i18n/t";
import type { ReportLocale } from "@/lib/i18n/locale";

const MAX_LISTED = 6;

function formatDate(date: Date, locale: ReportLocale): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function ComparisonCard({
  diff,
  previousAt,
  locale,
  t,
}: {
  diff: ScanDiff;
  previousAt: Date;
  locale: ReportLocale;
  t: Translate;
}) {
  const up = diff.scoreDelta > 0;
  const down = diff.scoreDelta < 0;
  const deltaColor = up ? "#16764f" : down ? "#c62a2f" : "#63676f";

  return (
    <section className="border-line bg-card shadow-card w-full max-w-204 rounded-2xl border p-6 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-brand-600 text-[10px] font-semibold tracking-[0.2em] uppercase">
            {t("report.changesSinceLast")}
          </span>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink">
            {t("report.whatMoved", { date: formatDate(previousAt, locale) })}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-2xl font-bold text-muted">{diff.scoreFrom}</span>
          <FontAwesomeIcon icon={faMinus} className="text-line-strong rotate-0 text-xs" />
          <span className="text-2xl font-bold text-ink">{diff.scoreTo}</span>
          {diff.comparable ? (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold"
              style={{ color: deltaColor, background: `${deltaColor}1a` }}
            >
              <FontAwesomeIcon
                icon={up ? faArrowUp : down ? faArrowDown : faMinus}
                className="text-[10px]"
              />
              {diff.scoreDelta > 0 ? `+${diff.scoreDelta}` : diff.scoreDelta}
            </span>
          ) : (
            <span className="rounded-full bg-canvas px-2.5 py-1 text-sm font-semibold text-muted">
              {t("report.scoringModelUpdated")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["critical", "serious", "moderate", "minor"] as Severity[]).map((s) => {
          const c = diff.counts[s];
          return (
            <div key={s} className="border-line rounded-xl border bg-canvas px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: sevHex[s] }} />
                <span className="text-[11px] font-semibold text-ink">{t(sevLabelKey[s])}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm text-muted">{c.from}</span>
                <span className="text-line-strong text-[10px]">→</span>
                <span className="text-sm font-semibold text-ink">{c.to}</span>
                {diff.comparable && c.delta !== 0 && (
                  <span
                    className="ml-auto text-[11px] font-bold"
                    style={{ color: c.delta < 0 ? "#16764f" : "#c62a2f" }}
                  >
                    {c.delta > 0 ? `+${c.delta}` : c.delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!diff.comparable && (
        <p className="mt-3 text-[12.5px] text-muted">
          {t("report.scoringModelNote", { from: diff.scoringFrom, to: diff.scoringTo })}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DiffList
          t={t}
          title={t("diff.cleared")}
          items={diff.fixed}
          icon={faCheck}
          tone="#16764f"
          empty={t("diff.noneCleared")}
        />
        <DiffList
          t={t}
          title={t("diff.newOrWorse")}
          items={diff.regressed}
          icon={faTriangleExclamation}
          tone="#c62a2f"
          empty={t("diff.noneWorse")}
        />
      </div>
    </section>
  );
}

function DiffList({
  title,
  items,
  icon,
  tone,
  empty,
  t,
}: {
  title: string;
  items: ViolationRef[];
  icon: typeof faCheck;
  tone: string;
  empty: string;
  t: Translate;
}) {
  return (
    <div className="border-line rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex size-5 items-center justify-center rounded-full text-[10px] text-white"
          style={{ background: tone }}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-sm font-medium text-muted">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {items.slice(0, MAX_LISTED).map((v) => (
            <li key={v.id} className="text-ink-soft flex items-center gap-2 text-[12.5px]">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: sevHex[v.severity] }}
              />
              <span className="truncate">{v.title}</span>
            </li>
          ))}
          {items.length > MAX_LISTED && (
            <li className="text-[11px] text-muted">
              {t("diff.andMore", { count: items.length - MAX_LISTED })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
