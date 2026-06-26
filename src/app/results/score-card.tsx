import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCode, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import type { ScanResult } from "@/lib/scan/types";

export function ScoreCard({ result }: { result: ScanResult }) {
  const { counts } = result;
  const compliant = counts.critical === 0 && counts.serious === 0;

  const countChips = [
    { label: "Critical", value: counts.critical, dot: "bg-critical" },
    { label: "Serious", value: counts.serious, dot: "bg-serious" },
    { label: "Moderate", value: counts.moderate, dot: "bg-moderate" },
    { label: "Passed", value: counts.passed, dot: "bg-success" },
  ];

  return (
    <div className="rounded-[18px] border border-line bg-card p-6 shadow-[0_1px_2px_rgba(16,18,29,.04),0_8px_28px_-16px_rgba(16,18,29,.12)]">
      <div className="flex items-center gap-5.5">
        <div
          className="flex size-29.5 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-brand-500) 0 ${result.score}%, var(--color-line) ${result.score}% 100%)`,
          }}
        >
          <div className="flex size-22.5 flex-col items-center justify-center rounded-full bg-card">
            <div className="text-[34px] leading-none font-bold tracking-tight">{result.score}</div>
            <div className="mt-0.75 font-mono text-[11px] text-faint">/ 100</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold">Accessibility score</span>
            {compliant ? (
              <span className="rounded-[7px] bg-[#e6f5ee] px-2.5 py-0.75 text-[11px] font-semibold tracking-wide text-success">
                WCAG AA
              </span>
            ) : (
              <span className="rounded-[7px] bg-[#fdecec] px-2.5 py-0.75 text-[11px] font-semibold tracking-wide text-critical">
                {counts.critical + counts.serious} blocker
                {counts.critical + counts.serious > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[13px] leading-normal text-ink-soft">{result.summary}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {countChips.map((c) => (
          <div
            key={c.label}
            className="flex-1 rounded-[11px] border border-line bg-[#fafbfc] px-3 py-2.75"
          >
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${c.dot}`} />
              <span className="text-lg font-bold tracking-tight">{c.value}</span>
            </div>
            <div className="mt-0.75 text-[11px] text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2.5">
        <Link
          href={`/report?url=${encodeURIComponent(result.finalUrl)}`}
          className="flex h-10.5 flex-1 items-center justify-center gap-2 rounded-[10px] bg-brand-500 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 active:translate-y-px"
        >
          <FontAwesomeIcon icon={faFilePdf} className="text-sm" />
          Export PDF
        </Link>
        <button className="flex h-10.5 flex-1 items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-card text-[13.5px] font-semibold text-ink transition-colors hover:bg-[#f6f7f9]">
          <FontAwesomeIcon icon={faFileCode} className="text-sm text-muted" />
          Export Markdown
        </button>
      </div>
    </div>
  );
}
