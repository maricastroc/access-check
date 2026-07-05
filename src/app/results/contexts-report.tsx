import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMobileScreenButton } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import type { ContextIssue } from "@/lib/scan/contexts";
import { sevDot, sevText, severityLabel } from "./data";

function IssueRow({ issue }: { issue: ContextIssue }) {
  const extra = issue.nodes - issue.selectors.length;
  return (
    <li className="rounded-[11px] border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={`size-1.75 shrink-0 rounded-full ${sevDot[issue.severity]}`} />
        <span className={`text-[11px] font-semibold ${sevText[issue.severity]}`}>
          {severityLabel[issue.severity]}
        </span>
        <span className="truncate font-mono text-[10.5px] text-faint">{issue.criterion}</span>
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-ink">{issue.title}</p>
      {issue.selectors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {issue.selectors.map((s) => (
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
 * Surfaces issues that only show up in contexts a single desktop-load audit
 * misses: at a 375px mobile viewport, and inside dynamic states we open
 * (menus / disclosures) and re-scan.
 */
export function ContextsReport({ result }: { result: ScanResult }) {
  const ctx = result.contexts;
  if (!ctx || (!ctx.mobile.ran && !ctx.dynamic.ran)) return null;

  const mobileIssues = ctx.mobile.onlyOnMobile;
  const states = ctx.dynamic.states;
  const clean = mobileIssues.length === 0 && states.length === 0;

  const checked: string[] = [];
  if (ctx.mobile.ran) checked.push(`${ctx.mobile.width}px viewport`);
  if (ctx.dynamic.ran) {
    checked.push(
      ctx.dynamic.opened === 1 ? "1 opened state" : `${ctx.dynamic.opened} opened states`,
    );
  }

  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
          <FontAwesomeIcon icon={faMobileScreenButton} className="text-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-bold text-ink">Responsive &amp; dynamic</h3>
          <p className="text-[11.5px] text-muted">
            Re-scanned beyond the initial desktop load — mobile width and opened menus.
          </p>
        </div>
        {clean && (
          <span className="shrink-0 rounded-full bg-success-surface px-2.5 py-1 text-[11px] font-semibold text-success-fg">
            No new issues
          </span>
        )}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">Checked {checked.join(" · ")}.</p>

      {clean ? (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          No violations surfaced at mobile width or in the states we opened that weren&apos;t already
          in the desktop report.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {mobileIssues.length > 0 && (
            <div>
              <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                Only at {ctx.mobile.width}px
              </h4>
              <ul className="flex flex-col gap-2">
                {mobileIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {states.map((state) => (
            <div key={state.selector}>
              <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                {state.label}
              </h4>
              <ul className="flex flex-col gap-2">
                {state.newIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
