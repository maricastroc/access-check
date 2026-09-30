import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { BANDS, SORTS, type BandKey, type SortKey } from "./history-utils";
import type { Translate } from "@/lib/i18n/t";

export function HistoryToolbar({
  query,
  sort,
  scoreBand,
  onQuery,
  onSort,
  onBand,
  t,
}: {
  query: string;
  sort: SortKey;
  scoreBand: BandKey;
  onQuery: (v: string) => void;
  onSort: (v: SortKey) => void;
  onBand: (v: BandKey) => void;
  t: Translate;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex flex-1 items-center gap-2">
        <label htmlFor="history-search" className="sr-only">
          {t("history.searchByDomain")}
        </label>
        <div className="flex h-9 w-full items-center gap-2.5 border border-border bg-surface px-3 focus-within:border-ink">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden className="text-xs text-muted" />
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("history.searchPlaceholder")}
            className="h-full w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label={t("history.clearSearch")}
              onClick={() => onQuery("")}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden className="text-xs" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div
          role="group"
          aria-label={t("history.filterByScore")}
          className="flex h-9 items-center gap-0.5 border border-border bg-surface p-0.5"
        >
          {BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              aria-pressed={b.key === scoreBand}
              onClick={() => onBand(b.key)}
              className={`h-full cursor-pointer px-3 text-[12.5px] font-medium transition-colors ${
                b.key === scoreBand ? "bg-ink text-white" : "text-body hover:text-ink"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <label htmlFor="history-sort" className="sr-only">
          {t("history.sortLabel")}
        </label>
        <select
          id="history-sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="h-9 cursor-pointer border border-border bg-surface px-2.5 text-[12.5px] font-medium text-body transition-colors hover:border-ink focus:border-ink focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
