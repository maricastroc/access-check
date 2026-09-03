import type { FindingView } from "@/lib/report/findings";
import { severityColorVar } from "@/lib/report/severity";
import { SectionKicker } from "./section-kicker";
import { Ruler } from "./ruler";
import { StatusSeal } from "./status-seal";
import { ColorSwatch } from "./color-swatch";
import { CodeBlock } from "./code-block";

function sealText(f: FindingView): string | undefined {
  if (f.fixStatus === "unchecked") {
    return f.kind === "best-practice"
      ? "Not a WCAG criterion — reported as coverage"
      : "Not re-audited — complementary pass";
  }
  return undefined; // verified / needs-review use their defaults
}

export function FindingDetail({ finding, host }: { finding: FindingView; host: string }) {
  const m = finding.measurement;
  const sevColor = finding.severity ? severityColorVar[finding.severity] : "var(--color-steel)";

  return (
    <div className="-mt-px border border-t-0 border-ink bg-surface p-3.5">
      {/* 1 — human impact */}
      <div className="pb-3.5">
        <SectionKicker>What happens to people who use it</SectionKicker>
        <p className="mt-2 text-[14.5px] leading-normal text-ink-2">{finding.desc}</p>
        <p className="mt-1.5 text-[13px] text-muted">{finding.who}</p>
      </div>

      {/* 2 — measurement (only when a real ratio was measured) */}
      {m && (
        <div className="border-t border-hairline py-3.5">
          <SectionKicker>Measurement</SectionKicker>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-cond text-[34px] leading-none tabular-nums" style={{ color: sevColor }}>
              {m.measured.toFixed(1)}:1
            </span>
            <span className="pb-1 text-[12.5px] text-muted">
              minimum AA {m.required.toFixed(1)}:1
              {m.fixed != null ? ` · corrected ${m.fixed.toFixed(2)}:1` : ""}
            </span>
          </div>
          <div className="mt-2">
            <Ruler variant="ratio" found={m.measured} required={m.required} fixed={m.fixed} height={18} />
          </div>
        </div>
      )}

      {/* 3 — suggested fix (sandbox language always) */}
      <div className="border-t border-hairline pt-3.5">
        <SectionKicker>Suggested fix</SectionKicker>
        {m && m.toHex ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
            {m.fromHex && (
              <>
                <ColorSwatch hex={m.fromHex} />
                <span className="font-mono text-[12.5px] text-muted">{m.fromHex.toUpperCase()}</span>
                <span aria-hidden className="text-muted">→</span>
              </>
            )}
            <ColorSwatch hex={m.toHex} />
            <span className="font-mono text-[12.5px] text-ink">{m.toHex.toUpperCase()}</span>
            {m.prop && <span className="text-muted">({m.prop})</span>}
          </div>
        ) : (
          <p className="mt-2 text-[13.5px] leading-normal text-body">{finding.fixText}</p>
        )}

        {finding.fixCode && (
          <div className="mt-2.5">
            <CodeBlock lines={[{ text: finding.fixCode, tone: finding.fixStatus === "verified" ? "added" : "default" }]} />
          </div>
        )}

        <div className="mt-3">
          <StatusSeal status={finding.fixStatus}>{sealText(finding)}</StatusSeal>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Tested in a sandbox copy. {host} was not altered.
        </p>
      </div>
    </div>
  );
}
