import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpRightAndDownLeftFromCenter,
  faPersonRunning,
  faBullhorn,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";
import type { AuditFinding } from "@/lib/scan/audits";
import { sevDot, sevText, severityLabel } from "./data";

/** One finding row — shared shape across every custom audit (and keyboard). */
function AuditFindingRow({ f }: { f: AuditFinding }) {
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
 * Shared card chrome for every custom audit — same visual language as
 * KeyboardReport, so target size, reduced motion and live regions all read as
 * one family instead of three bespoke components.
 */
export function AuditCard({
  icon,
  title,
  subtitle,
  meta,
  findings,
  cleanBadge,
  cleanText,
}: {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  meta: ReactNode;
  findings: AuditFinding[];
  cleanBadge: string;
  cleanText: string;
}) {
  const clean = findings.length === 0;
  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
          <FontAwesomeIcon icon={icon} className="text-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-bold text-ink">{title}</h3>
          <p className="text-[11.5px] text-muted">{subtitle}</p>
        </div>
        {clean && (
          <span className="shrink-0 rounded-full bg-success-surface px-2.5 py-1 text-[11px] font-semibold text-success-fg">
            {cleanBadge}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">{meta}</p>

      {clean ? (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{cleanText}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {findings.map((f) => (
            <AuditFindingRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function TargetSizeReport({ result }: { result: ScanResult }) {
  const report = result.audits?.targetSize;
  if (!report) return null;
  return (
    <AuditCard
      icon={faUpRightAndDownLeftFromCenter}
      title="Target size"
      subtitle="Beyond the static audit — we measure every pointer target against WCAG 2.5.8."
      meta={`Measured ${report.measured} interactive ${report.measured === 1 ? "target" : "targets"} against the 24×24px minimum.`}
      findings={report.findings}
      cleanBadge="All pass"
      cleanText="Every interactive target met the 24×24px minimum or had enough spacing around it."
    />
  );
}

export function ReducedMotionReport({ result }: { result: ScanResult }) {
  const report = result.audits?.reducedMotion;
  if (!report || !report.ran) return null;
  return (
    <AuditCard
      icon={faPersonRunning}
      title="Reduced motion"
      subtitle="We set prefers-reduced-motion: reduce and watch what keeps animating."
      meta={`${report.running} ${report.running === 1 ? "animation was" : "animations were"} still running under the reduced-motion preference.`}
      findings={report.findings}
      cleanBadge="Respected"
      cleanText="No looping or long, non-trivial animations kept running once reduced motion was set."
    />
  );
}

export function LiveRegionsReport({ result }: { result: ScanResult }) {
  const report = result.audits?.liveRegions;
  if (!report) return null;
  return (
    <AuditCard
      icon={faBullhorn}
      title="Live regions"
      subtitle="We inspect every ARIA live region for setups that silently swallow updates."
      meta={`Inspected ${report.regions} live ${report.regions === 1 ? "region" : "regions"} for announcement problems.`}
      findings={report.findings}
      cleanBadge="No issues"
      cleanText="Every live region was configured so screen readers can actually announce its updates."
    />
  );
}
