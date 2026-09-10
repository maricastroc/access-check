"use client";

import { useState } from "react";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import type { Verdict } from "@/lib/report/verdict";
import { verdictLabel, verdictMessage } from "@/lib/report/verdict";
import { ratioPosition } from "@/lib/report/contrast";
import type { ContrastPreview } from "@/lib/report/preview";
import { severityColorVar } from "@/lib/report/severity";
import { SectionKicker } from "./section-kicker";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

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

function VerdictSeal({ verdict, t }: { verdict: Verdict; t: Translate }) {
  const s = SEAL[verdict.kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1.5 text-[12.5px] leading-tight",
        s.cls,
      )}
    >
      <span aria-hidden className="font-cond text-[13px]">
        {s.glyph}
      </span>
      {verdictLabel(verdict, t)}
    </span>
  );
}

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
      <span
        className="hatch-serious absolute inset-y-0 left-0"
        style={{ width: `${ratioPosition(found)}%` }}
      />
      <span
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-ink"
        style={{ left: `${ratioPosition(required)}%` }}
      />
      {fixed != null && (
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2"
          style={{ left: `${ratioPosition(fixed)}%`, background: fixedColor ?? "var(--color-ink)" }}
        />
      )}
    </div>
  );
}

function Chip({ fg, bg, large, t }: { fg: string; bg: string; large: boolean; t: Translate }) {
  return (
    <div
      className="flex h-16 items-center justify-center px-3 text-center"
      style={{ background: bg, color: fg }}
    >
      <span className={large ? "text-[19px] font-semibold" : "text-[15px]"}>
        {t("detail.sampleText")}
      </span>
    </div>
  );
}

function CONF_META(preview: ContrastPreview, t: Translate) {
  if (preview.confidence === "verified")
    return {
      label: t("detail.verifiedOnElement"),
      cls: "text-verified",
      accent: "var(--color-verified)",
      result: t("detail.verifiedOnElementNote"),
    };
  if (preview.confidence === "calculated")
    return {
      label: t("detail.calculated"),
      cls: "text-steel",
      accent: "var(--color-steel)",
      result: t("detail.calculatedNote", { ratio: preview.simulated.ratio.toFixed(2) }),
    };
  return {
    label: t("detail.uncertain"),
    cls: "text-moderate-text",
    accent: "var(--color-moderate)",
    result: t("detail.uncertainNote"),
  };
}

function ContrastFixPreview({ preview, t }: { preview: ContrastPreview; t: Translate }) {
  const [view, setView] = useState<"original" | "suggested">("suggested");
  const shown = view === "original" ? preview.original : preview.simulated;
  const large = preview.required <= 3;
  const meta = CONF_META(preview, t);

  return (
    <div className="mt-2">
      <p className="font-cond text-[11px] tracking-[0.08em] text-muted uppercase">
        {t("detail.contrastPreview")}
      </p>
      <div
        role="group"
        aria-label={t("detail.contrastPreview")}
        className="mt-1.5 inline-flex border border-border text-[12.5px]"
      >
        {(["original", "suggested"] as const).map((v, i) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(
              "cursor-pointer px-3 py-1.5 font-medium capitalize",
              i > 0 && "border-l border-border",
              view === v ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-band",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mt-2 border border-border">
        <Chip t={t} fg={shown.fg} bg={shown.bg} large={large} />
        <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5">
          <span
            className="font-cond text-[15px] tabular-nums"
            style={{ color: view === "original" ? "var(--color-serious)" : meta.accent }}
          >
            {shown.ratio.toFixed(2)}:1
          </span>
          <span className="text-[11.5px] text-muted">
            {view === "original" ? t("detail.currentView") : meta.label} ·{" "}
            {t("ratio.minAAShort", { required: preview.required.toFixed(1) })}
            {large ? t("detail.largeText") : ""}
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

      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-muted">{t("detail.property")}</dt>
        <dd className="font-mono text-ink">{preview.prop}</dd>
        <dt className="text-muted">{t("detail.detected")}</dt>
        <dd className="font-mono text-ink">{preview.originalValue.toUpperCase()}</dd>
        <dt className="text-muted">{t("detail.suggested")}</dt>
        <dd className="font-mono text-ink">{preview.suggestedValue.toUpperCase()}</dd>
        <dt className="text-muted">{t("detail.result")}</dt>
        <dd className={meta.cls}>{meta.result}</dd>
      </dl>

      {preview.reason && <p className="mt-2 text-[12px] text-moderate-text">{preview.reason}</p>}
      <p className="mt-2 text-[11.5px] text-muted">
        {t("detail.previewNote")}
        {preview.shared ? ` ${t("detail.sharedColorPair", { count: preview.sharedCount })}` : ""}
      </p>
    </div>
  );
}

export function FindingDetail({
  finding,
  host,
  t,
  onOpenEvidence,
}: {
  finding: FindingView;
  host: string;
  t: Translate;
  onOpenEvidence?: () => void;
}) {
  const located = locatedMarkers(finding);
  const affectedShown = finding.affectedSelectors.slice(0, 6);
  const affectedExtra = finding.affectedSelectors.length - affectedShown.length;
  const railColor = finding.severity ? severityColorVar[finding.severity] : "var(--color-steel)";

  return (
    <div
      className="-mt-px border border-t-0 border-ink bg-surface"
      style={{ borderLeft: `4px solid ${railColor}` }}
    >
      <section className="p-3.5">
        <SectionKicker>{t("detail.impactOnUsers")}</SectionKicker>
        <p className="mt-2 text-[14px] leading-normal text-ink-2">{finding.impact}</p>
      </section>

      <section className="border-t border-hairline p-3.5">
        <SectionKicker>{t("detail.affectedElement")}</SectionKicker>
        {finding.affectedSelectors.length > 0 ? (
          <>
            {located > 0 && onOpenEvidence ? (
              <button
                type="button"
                onClick={onOpenEvidence}
                className="mt-2 flex w-full cursor-pointer items-center gap-2 border border-hairline bg-code px-2 py-1.5 text-left text-[13px] transition-colors hover:border-ink hover:bg-band"
              >
                <span
                  aria-hidden
                  className="inline-flex size-4.5 shrink-0 items-center justify-center bg-ink font-cond text-[11px] font-semibold text-surface"
                >
                  {finding.markers[0]?.n ?? 1}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-steel">
                  {finding.affectedSelectors[0]}
                </code>
                <span className="shrink-0 text-[11.5px] font-medium text-ink underline">
                  {t("capture.openEvidence")}
                </span>
              </button>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-[13px]">
                <code className="font-mono text-[12.5px] text-steel">
                  {finding.affectedSelectors[0]}
                </code>
              </p>
            )}
            <p className="mt-1.5 text-[12.5px] text-muted">
              <span className="font-medium text-ink tabular-nums">{finding.elements}</span>{" "}
              {t("detail.elementsAffected", { count: finding.elements })} ·{" "}
              {t("capture.shownOnScreenshot", { count: located })}
            </p>
            {finding.affectedSelectors.length > 1 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {affectedShown.slice(1).map((s) => (
                  <li
                    key={s}
                    className="border border-hairline bg-code px-1.5 py-0.5 font-mono text-[11px] text-body"
                  >
                    {s}
                  </li>
                ))}
                {affectedExtra > 0 && (
                  <li className="px-1 py-0.5 text-[11px] text-muted">
                    {t("detail.moreSelectors", { count: affectedExtra })}
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-body">
            {t("detail.elementsAffected", { count: finding.elements })}
          </p>
        )}
        {located === 0 && (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-muted">
            <span
              aria-hidden
              className="mt-0.5 inline-block size-3 shrink-0 border border-dashed border-border"
            />
            {finding.noMarkerReason}
          </p>
        )}
      </section>

      <section className="border-t border-hairline p-3.5">
        <SectionKicker>{t("detail.howToFix")}</SectionKicker>
        {finding.preview ? (
          <ContrastFixPreview t={t} preview={finding.preview} />
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
                <CodeBlock
                  lines={[
                    {
                      text: finding.fixCode,
                      tone: finding.verdict.kind === "verified" ? "added" : "default",
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section className="border-t border-hairline p-3.5">
        <SectionKicker>{t("detail.verificationResult")}</SectionKicker>
        <div className="mt-2">
          <VerdictSeal verdict={finding.verdict} t={t} />
        </div>
        <p className="mt-2 text-[12.5px] leading-normal text-body">
          {verdictMessage(finding.verdict, t, finding.measurement)}
        </p>
        {finding.verdict.kind !== "best-practice" && finding.verdict.kind !== "complementary" && (
          <p className="mt-1.5 text-[11.5px] text-muted">{t("detail.sandboxNote", { host })}</p>
        )}
      </section>
    </div>
  );
}

function exampleLines(code: string): { text: string; tone?: "added" | "default" }[] {
  return code.split("\n").map((text) => ({ text, tone: "default" }));
}
