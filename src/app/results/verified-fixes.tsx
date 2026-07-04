import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import { verifyStats } from "./shared";

/**
 * Surfaces the flagship behaviour — every suggested fix is applied to the live
 * page and the audit re-run — as a single headline metric, instead of leaving
 * it buried in the per-fix pills inside each expanded card.
 */
export function VerifiedFixes({ result }: { result: ScanResult }) {
  const { verified, checked } = verifyStats(result);
  if (checked === 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-[14px] border border-success-border bg-success-surface px-5 py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-success text-white">
        <FontAwesomeIcon icon={faShieldHalved} className="text-[17px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-bold text-ink">
            {verified}
            {checked > verified && (
              <span className="font-semibold text-success-fg"> / {checked}</span>
            )}
          </span>
          <span className="text-[13px] font-semibold text-ink">
            {verified === 1 ? "fix" : "fixes"} auto-verified
          </span>
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-success-fg">
          Not just suggested — each fix is applied to the live page and the audit is re-run, so you
          only act on changes proven to clear the violation.
        </p>
      </div>
    </div>
  );
}
