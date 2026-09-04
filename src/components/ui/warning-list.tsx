import type { ScanWarning } from "@/lib/scan/types";

/**
 * Partial-audit notices: a plain-language reason per skipped or incomplete step,
 * in olive. These are caveats about the audit, never a failure of the audited page.
 */
export function WarningList({
  warnings,
  title = "Partial report",
  note,
}: {
  warnings: ScanWarning[];
  title?: string;
  note?: string;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="border border-moderate bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex size-[22px] shrink-0 items-center justify-center bg-moderate font-cond text-[15px] font-semibold text-surface"
        >
          !
        </span>
        <h3 className="text-[15.5px] font-semibold text-ink">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {warnings.map((w) => (
          <li key={w.code} className="flex items-start gap-2.5 text-[13px] leading-normal">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 bg-moderate" />
            <span className="text-body">{w.message}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 border-t border-hairline pt-2.5 text-[12.5px] text-muted">{note}</p>}
    </div>
  );
}
