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
import { sevHex, sevLabel } from "../shared";

const MAX_LISTED = 6;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ComparisonCard({ diff, previousAt }: { diff: ScanDiff; previousAt: Date }) {
  const up = diff.scoreDelta > 0;
  const down = diff.scoreDelta < 0;
  const deltaColor = up ? "#16764f" : down ? "#c62a2f" : "#63676f";

  return (
    <section className="w-full max-w-204 rounded-2xl border border-line bg-card p-6 shadow-card print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-brand-600 uppercase">
            Changes since last scan
          </span>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink">
            What moved since {dateFmt.format(previousAt)}
          </h2>
        </div>

        {/* score from → to + delta */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-2xl font-bold text-muted">{diff.scoreFrom}</span>
          <FontAwesomeIcon icon={faMinus} className="rotate-0 text-xs text-line-strong" />
          <span className="text-2xl font-bold text-ink">{diff.scoreTo}</span>
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
        </div>
      </div>

      {/* severity deltas */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["critical", "serious", "moderate", "minor"] as Severity[]).map((s) => {
          const c = diff.counts[s];
          return (
            <div key={s} className="rounded-xl border border-line bg-canvas px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: sevHex[s] }} />
                <span className="text-[11px] font-semibold text-ink">{sevLabel[s]}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm text-muted">{c.from}</span>
                <span className="text-[10px] text-line-strong">→</span>
                <span className="text-sm font-semibold text-ink">{c.to}</span>
                {c.delta !== 0 && (
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

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DiffList
          title="Fixed"
          items={diff.fixed}
          icon={faCheck}
          tone="#16764f"
          empty="No rules cleared since last scan."
        />
        <DiffList
          title="New / regressed"
          items={diff.regressed}
          icon={faTriangleExclamation}
          tone="#c62a2f"
          empty="No new rules flagged — nothing regressed."
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
}: {
  title: string;
  items: ViolationRef[];
  icon: typeof faCheck;
  tone: string;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
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
            <li key={v.id} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: sevHex[v.severity] }}
              />
              <span className="truncate">{v.title}</span>
            </li>
          ))}
          {items.length > MAX_LISTED && (
            <li className="text-[11px] text-muted">+ {items.length - MAX_LISTED} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
