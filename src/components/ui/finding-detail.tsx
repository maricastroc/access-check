"use client";

import { useState } from "react";
import type { FindingView } from "@/lib/report/findings";
import type { Verdict } from "@/lib/report/verdict";
import { verdictLabel, verdictMessage } from "@/lib/report/verdict";
import { ratioPosition } from "@/lib/report/contrast";
import type { ContrastPreview } from "@/lib/report/preview";
import { severityColorVar } from "@/lib/report/severity";
import { SectionKicker } from "./section-kicker";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/cn";

/* ── verdict seal ── */
const SEAL: Record<Verdict["kind"], { cls: string; glyph: string }> = {
  verified: { cls: "border-solid border-verified bg-verified/[0.08] text-verified", glyph: "✓" },
  partial: { cls: "border-dashed border-moderate text-moderate-text", glyph: "◑" },
  sampled: { cls: "border-dashed border-steel text-steel", glyph: "◐" },
  failed: { cls: "border-dashed border-moderate text-moderate-text", glyph: "?" },
  unverifiable: { cls: "border-dashed border-border text-muted", glyph: "·" },
  "no-auto-fix": { cls: "border-dashed border-border text-muted", glyph: "·" },
  "best-practice": { cls: "border-solid border-steel text-steel", glyph: "◇" },
  complementary: { cls: "border-dashed border-border text-muted", glyph: "·" },
};

function VerdictSeal({ verdict }: { verdict: Verdict }) {
  const s = SEAL[verdict.kind];
  return (
    <span className={cn("inline-flex items-center gap-2 border px-2.5 py-1.5 text-[12.5px] leading-tight", s.cls)}>
      <span aria-hidden className="font-cond text-[13px]">
        {s.glyph}
      </span>
      {verdictLabel(verdict)}
    </span>
  );
}

/* ── contrast / color preview (detected colors only — not the real element) ── */
function RatioBar({
  found,
  required,
  fixed,
  fixedColor,
}: {
  found: number;
  required: number;
  fixed?: number;
  fixedColor?: string;
}) {
  return (
    <div className="relative h-3 w-full overflow-hidden border border-ink bg-surface">
      <span className="hatch-serious absolute inset-y-0 left-0" style={{ width: `${ratioPosition(found)}%` }} />
      <span className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-ink" style={{ left: `${ratioPosition(required)}%` }} />
      {fixed != null && (
        <span
          className="absolute inset-y-0 w-[2px] -translate-x-1/2"
          style={{ left: `${ratioPosition(fixed)}%`, background: fixedColor ?? "var(--color-ink)" }}
        />
      )}
    </div>
  );
}

function Chip({ fg, bg, large }: { fg: string; bg: string; large: boolean }) {
  return (
    <div
      className="flex h-16 items-center justify-center px-3 text-center"
      style={{ background: bg, color: fg }}
    >
      <span className={large ? "text-[19px] font-semibold" : "text-[15px]"}>Sample text</span>
    </div>
  );
}

function CONF_META(preview: ContrastPreview) {
  if (preview.confidence === "verified")
    return {
      label: "Verified on this element",
      cls: "text-verified",
      accent: "var(--color-verified)",
      result: "Passes WCAG AA, confirmed by re-audit of the located element",
    };
  if (preview.confidence === "calculated")
    return {
      label: "Calculated",
      cls: "text-steel",
      accent: "var(--color-steel)",
      result: `Would reach ${preview.simulated.ratio.toFixed(2)}:1, calculated from the detected colors, not verified live`,
    };
  return {
    label: "Result uncertain",
    cls: "text-moderate-text",
    accent: "var(--color-moderate)",
    result: "Can't confirm this reaches the minimum on the real background",
  };
}

function ContrastFixPreview({ preview }: { preview: ContrastPreview }) {
  const [view, setView] = useState<"original" | "suggested">("suggested");
  const shown = view === "original" ? preview.original : preview.simulated;
  const large = preview.required <= 3;
  const meta = CONF_META(preview);

  return (
    <div className="mt-2">
      <p className="font-cond text-[11px] tracking-[0.08em] text-muted uppercase">Contrast preview</p>
      {/* toggle — the detected color pair, before and with the suggested value */}
      <div role="group" aria-label="Contrast preview" className="mt-1.5 inline-flex border border-border text-[12.5px]">
        {(["original", "suggested"] as const).map((v, i) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-1.5 font-medium capitalize",
              i > 0 && "border-l border-border",
              view === v ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-band",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* the isolated reproduction on the detected color pair */}
      <div className="mt-2 border border-border">
        <Chip fg={shown.fg} bg={shown.bg} large={large} />
        <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5">
          <span
            className="font-cond text-[15px] tabular-nums"
            style={{ color: view === "original" ? "var(--color-serious)" : meta.accent }}
          >
            {shown.ratio.toFixed(2)}:1
          </span>
          <span className="text-[11.5px] text-muted">
            {view === "original" ? "current" : meta.label} · min AA {preview.required.toFixed(1)}:1
            {large ? " (large text)" : ""}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <RatioBar
          found={preview.original.ratio}
          required={preview.required}
          fixed={preview.simulated.ratio}
          fixedColor={meta.accent}
        />
      </div>

      {/* objective values */}
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-muted">Property</dt>
        <dd className="font-mono text-ink">{preview.prop}</dd>
        <dt className="text-muted">Detected</dt>
        <dd className="font-mono text-ink">{preview.originalValue.toUpperCase()}</dd>
        <dt className="text-muted">Suggested</dt>
        <dd className="font-mono text-ink">{preview.suggestedValue.toUpperCase()}</dd>
        <dt className="text-muted">Result</dt>
        <dd className={meta.cls}>{meta.result}</dd>
      </dl>

      {preview.reason && <p className="mt-2 text-[12px] text-moderate-text">{preview.reason}</p>}
      <p className="mt-2 text-[11.5px] text-muted">
        Preview uses the detected foreground and background colors. Typography and page context are
        not reproduced.
        {preview.shared ? ` ${preview.sharedCount} occurrences share this detected color pair.` : ""}
      </p>
    </div>
  );
}

/* ── the four-block detail ── */
export function FindingDetail({ finding, host }: { finding: FindingView; host: string }) {
  const located = finding.markers.length;
  const affectedShown = finding.affectedSelectors.slice(0, 6);
  const affectedExtra = finding.affectedSelectors.length - affectedShown.length;
  const railColor = finding.severity ? severityColorVar[finding.severity] : "var(--color-steel)";

  return (
    <div className="-mt-px border border-t-0 border-ink bg-surface" style={{ borderLeft: `4px solid ${railColor}` }}>
      {/* 1 — impact on users */}
      <section className="p-3.5">
        <SectionKicker>Impact on users</SectionKicker>
        <p className="mt-2 text-[14px] leading-normal text-ink-2">{finding.impact}</p>
      </section>

      {/* 2 — affected element */}
      <section className="border-t border-hairline p-3.5">
        <SectionKicker>Affected element</SectionKicker>
        {finding.affectedSelectors.length > 0 ? (
          <>
            <p className="mt-2 flex items-center gap-2 text-[13px]">
              {located > 0 && (
                <span
                  aria-hidden
                  className="inline-flex size-[18px] shrink-0 items-center justify-center bg-ink font-cond text-[11px] font-semibold text-surface"
                >
                  1
                </span>
              )}
              <code className="font-mono text-[12.5px] text-steel">{finding.affectedSelectors[0]}</code>
              {located > 0 && <span className="text-[11.5px] text-muted">· on the screenshot</span>}
            </p>
            <p className="mt-1.5 text-[12.5px] text-muted">
              <span className="font-medium text-ink tabular-nums">{finding.elements}</span> element
              {finding.elements === 1 ? "" : "s"} affected · {located} shown on the screenshot
            </p>
            {finding.affectedSelectors.length > 1 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {affectedShown.slice(1).map((s) => (
                  <li key={s} className="border border-hairline bg-code px-1.5 py-0.5 font-mono text-[11px] text-body">
                    {s}
                  </li>
                ))}
                {affectedExtra > 0 && (
                  <li className="px-1 py-0.5 text-[11px] text-muted">+{affectedExtra} more</li>
                )}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-body">{finding.elements} affected</p>
        )}
        {located === 0 && (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-muted">
            <span aria-hidden className="mt-0.5 inline-block size-3 shrink-0 border border-dashed border-border" />
            {finding.noMarkerReason}
          </p>
        )}
      </section>

      {/* 3 — how to fix */}
      <section className="border-t border-hairline p-3.5">
        <SectionKicker>How to fix</SectionKicker>
        {finding.preview ? (
          <ContrastFixPreview preview={finding.preview} />
        ) : finding.guidance ? (
          <>
            <p className="mt-2 text-[13.5px] leading-normal text-body">{finding.guidance.action}</p>
            {finding.guidance.example && (
              <div className="mt-2.5">
                <CodeBlock lines={exampleLines(finding.guidance.example.code)} />
              </div>
            )}
            {finding.guidance.caution && (
              <p className="mt-2 text-[12px] text-moderate-text">{finding.guidance.caution}</p>
            )}
            {finding.guidance.humanDecision && (
              <p className="mt-2 text-[12px] text-muted">
                The right change depends on the page&apos;s structure, so confirm it in context.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-[13.5px] leading-normal text-body">{finding.fixText}</p>
            {finding.fixCode && (
              <div className="mt-2.5">
                <CodeBlock lines={[{ text: finding.fixCode, tone: finding.verdict.kind === "verified" ? "added" : "default" }]} />
              </div>
            )}
          </>
        )}
      </section>

      {/* 4 — verification result */}
      <section className="border-t border-hairline p-3.5">
        <SectionKicker>Verification result</SectionKicker>
        <div className="mt-2">
          <VerdictSeal verdict={finding.verdict} />
        </div>
        <p className="mt-2 text-[12.5px] leading-normal text-body">
          {verdictMessage(finding.verdict, finding.measurement)}
        </p>
        {finding.verdict.kind !== "best-practice" && finding.verdict.kind !== "complementary" && (
          <p className="mt-1.5 text-[11.5px] text-muted">
            Fixes are applied and reverted in a sandbox copy. {host} was not altered.
          </p>
        )}
      </section>
    </div>
  );
}

function exampleLines(code: string): { text: string; tone?: "added" | "default" }[] {
  return code.split("\n").map((text) => ({ text, tone: "default" }));
}
