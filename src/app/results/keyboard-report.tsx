import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKeyboard } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import type { KeyboardFinding } from "@/lib/scan/keyboard";
import { sevDot, sevText, severityLabel } from "./data";

function FindingRow({ f }: { f: KeyboardFinding }) {
  const extra = f.count - f.selectors.length;
  return (
    <li className="rounded-[11px] border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={`size-1.75 shrink-0 rounded-full ${sevDot[f.severity]}`} />
        <span className={`text-[11px] font-semibold ${sevText[f.severity]}`}>
          {severityLabel[f.severity]}
        </span>
        <span className="truncate font-mono text-[10.5px] text-faint">{f.criterion}</span>
      </div>

      <p className="mt-1.5 text-[13px] font-semibold text-ink">{f.title}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{f.desc}</p>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Fix: </span>
        {f.fix}
      </p>

      {f.selectors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {f.selectors.map((s) => (
            <code
              key={s}
              className="max-w-full truncate rounded-md border border-line bg-card px-1.75 py-0.75 font-mono text-[10.5px] text-ink-soft"
            >
              {s}
            </code>
          ))}
          {extra > 0 && <span className="text-[10.5px] text-faint">+{extra} more</span>}
        </div>
      )}
    </li>
  );
}

/**
 * Surfaces the keyboard & focus analysis — the interaction layer axe-core
 * can't see. We actually tab through the page, so this reports real focus
 * behaviour: reachability, visible focus, order, and traps.
 */
export function KeyboardReport({ result }: { result: ScanResult }) {
  const kb = result.keyboard;
  if (!kb) return null;

  const clean = kb.findings.length === 0;
  const reach =
    kb.totalInteractive > 0
      ? `${kb.reachableInteractive}/${kb.totalInteractive} interactive elements reachable by keyboard`
      : "no interactive controls detected";

  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
          <FontAwesomeIcon icon={faKeyboard} className="text-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-bold text-ink">Keyboard &amp; focus</h3>
          <p className="text-[11.5px] text-muted">
            Beyond the static audit — we tab through the page to test real focus behaviour.
          </p>
        </div>
        {clean && (
          <span className="shrink-0 rounded-full bg-success-surface px-2.5 py-1 text-[11px] font-semibold text-success-fg">
            No issues
          </span>
        )}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        Traced {kb.totalStops} focus {kb.totalStops === 1 ? "stop" : "stops"} · {reach}
        {kb.truncated && ` · stopped at ${kb.totalStops} (page has more)`}
      </p>

      {clean ? (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Every focus stop had a visible indicator, the order followed the layout, and no traps
          were found.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {kb.findings.map((f) => (
            <FindingRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </div>
  );
}
