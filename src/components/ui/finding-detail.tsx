"use client";

import { useState, type ReactNode } from "react";
import { locatedMarkers, type FindingView } from "@/lib/report/findings";
import { describeElement } from "@/lib/report/identity";
import { verdictMessage, verdictTone } from "@/lib/report/verdict";
import { ratioPosition } from "@/lib/report/contrast";
import type { ContrastPreview } from "@/lib/report/preview";
import { severityColorVar } from "@/lib/report/severity";
import { reviewGuidance } from "@/lib/scan/review";
import { SectionKicker } from "./section-kicker";
import { VerdictSeal } from "./verdict-seal";
import { CodeBlock } from "./code-block";
import { Button } from "./button";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

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
              "cursor-pointer px-3 py-1.5 font-medium",
              i > 0 && "border-l border-border",
              view === v ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-band",
            )}
          >
            {v === "original" ? t("detail.viewCurrent") : t("detail.suggested")}
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

function Part({
  label,
  first = false,
  children,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("p-3.5", !first && "border-t border-hairline")}>
      <SectionKicker as="h4">{label}</SectionKicker>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Where({
  finding,
  t,
  onOpenEvidence,
}: {
  finding: FindingView;
  t: Translate;
  onOpenEvidence?: () => void;
}) {
  const located = locatedMarkers(finding);
  const marks = [...new Set(finding.markers.map((m) => m.n))].slice(0, 4);
  const primary = finding.affectedSelectors[0];
  const element = primary ? describeElement(primary, finding.identities[primary], t) : null;
  const others = finding.affectedSelectors.slice(1, 6);
  const extra = finding.affectedSelectors.length - 1 - others.length;

  return (
    <Part label={t("panel.where")} first>
      {element ? (
        <>
          <p className="font-mono text-[12.5px] break-words text-ink">{element.label}</p>
          {element.context && (
            <p className="text-[12px] break-words text-muted">{element.context}</p>
          )}
        </>
      ) : (
        <p className="text-[13px] text-body">{t("unit.element", { count: finding.elements })}</p>
      )}

      {element && finding.elements > 1 && (
        <p className="mt-1.5 text-[12.5px] text-muted">
          {t("unit.element", { count: finding.elements })} ·{" "}
          {t("capture.shownOnScreenshot", { count: located })}
        </p>
      )}

      {others.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {others.map((s) => (
            <li
              key={s}
              className="border border-hairline bg-code px-1.5 py-0.5 font-mono text-[11px] break-words text-body"
            >
              {describeElement(s, finding.identities[s], t).label}
            </li>
          ))}
          {extra > 0 && (
            <li className="px-1 py-0.5 text-[11px] text-muted">
              {t("detail.moreSelectors", { count: extra })}
            </li>
          )}
        </ul>
      )}

      {located > 0 && onOpenEvidence ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span aria-hidden className="flex gap-1">
            {marks.map((n) => (
              <span
                key={n}
                className="inline-flex size-5 items-center justify-center bg-ink font-cond text-[11px] font-semibold text-surface"
              >
                {n}
              </span>
            ))}
          </span>
          <Button variant="secondary" size="sm" onClick={onOpenEvidence}>
            {t("results.showOnScreenshot")}
          </Button>
        </div>
      ) : located === 0 ? (
        <p className="mt-2 flex items-start gap-2 text-[12px] text-muted">
          <span
            aria-hidden
            className="mt-0.5 inline-block size-3 shrink-0 border border-dashed border-border"
          />
          {finding.noMarkerReason}
        </p>
      ) : null}
    </Part>
  );
}

function WhatToChange({ finding, host, t }: { finding: FindingView; host: string; t: Translate }) {
  const tone = verdictTone(finding.verdict);

  return (
    <Part label={t("panel.whatToChange")}>
      {finding.preview ? (
        <ContrastFixPreview t={t} preview={finding.preview} />
      ) : finding.guidance ? (
        <>
          <p className="text-[13.5px] leading-normal text-body">{finding.guidance.action}</p>
          {finding.guidance.example && (
            <div className="mt-2.5">
              <CodeBlock lines={exampleLines(finding.guidance.example.code)} />
            </div>
          )}
          {finding.guidance.caution && (
            <p className="mt-2 text-[12px] text-moderate-text">{finding.guidance.caution}</p>
          )}
          {finding.guidance.humanDecision && (
            <p className="mt-2 text-[12px] text-muted">{t("detail.humanDecision")}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-[13.5px] leading-normal text-body">{finding.fixText}</p>
          {finding.fixCode && (
            <div className="mt-2.5">
              <CodeBlock
                lines={[{ text: finding.fixCode, tone: tone === "verified" ? "added" : "default" }]}
              />
            </div>
          )}
        </>
      )}

      {tone === "quiet" ? (
        <p className="mt-2.5 text-[12px] leading-normal text-muted">
          {verdictMessage(finding.verdict, t, finding.measurement)}
        </p>
      ) : (
        <div className="mt-3">
          <VerdictSeal verdict={finding.verdict} t={t} />
          <p className="mt-2 text-[12.5px] leading-normal text-body">
            {verdictMessage(finding.verdict, t, finding.measurement)}
          </p>
          <p className="mt-1.5 text-[11.5px] text-muted">{t("detail.sandboxNote", { host })}</p>
        </div>
      )}
    </Part>
  );
}

function HowToCheck({ ruleId, t }: { ruleId: string; t: Translate }) {
  const guide = reviewGuidance(ruleId, t);
  return (
    <Part label={t("panel.howToCheck")}>
      <p className="text-[13.5px] leading-normal text-body">{guide.how}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] leading-normal text-body">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </Part>
  );
}

function Why({ finding, t }: { finding: FindingView; t: Translate }) {
  return (
    <Part label={t("panel.why")}>
      <p className="text-[13.5px] leading-normal text-ink-2">{finding.impact}</p>
      {finding.evidence === "heuristic" && finding.kind !== "manual-review" && (
        <div className="mt-2.5 border border-dashed border-border bg-band px-2.5 py-2">
          <SectionKicker as="div">{t("evidence.heuristic.title")}</SectionKicker>
          <p className="mt-1 text-[12.5px] leading-normal text-body">
            {t("evidence.heuristic.body")}
          </p>
        </div>
      )}
      {finding.contexts.length > 0 && (
        <p className="mt-2 text-[12px] text-muted">
          {t("panel.alsoFailsIn", { contexts: finding.contexts.join(", ") })}
        </p>
      )}
    </Part>
  );
}

function Details({ finding, t }: { finding: FindingView; t: Translate }) {
  const primary = finding.affectedSelectors[0];
  const element = primary ? describeElement(primary, finding.identities[primary], t) : null;
  const locator = element && element.label !== element.locator ? element.locator : null;
  const criterion = [finding.criterionSc, finding.criterionName].filter(Boolean).join(" ");
  const measured = finding.occurrences
    .map((o) => [o.reason, o.measured].filter(Boolean).join(" "))
    .filter(Boolean);

  return (
    <details className="border-t border-hairline px-3.5 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <span aria-hidden className="ac-chev font-cond text-muted transition-transform">
          ▸
        </span>
        <SectionKicker as="h4">{t("panel.details")}</SectionKicker>
      </summary>
      <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
        {locator && (
          <>
            <dt className="text-muted">{t("panel.selector")}</dt>
            <dd className="font-mono break-all text-steel">{locator}</dd>
          </>
        )}
        <dt className="text-muted">{t("detail.rule")}</dt>
        <dd className="text-body">
          <code className="font-mono text-steel">{finding.ruleId}</code>
          {criterion && ` · ${criterion}`}
        </dd>
        {measured.length > 0 && (
          <>
            <dt className="text-muted">{t("panel.measured")}</dt>
            <dd>
              <ul className="space-y-1">
                {measured.map((line, i) => (
                  <li key={i} className="leading-normal break-words text-body">
                    {line}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </details>
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
  const railColor = finding.severity ? severityColorVar[finding.severity] : "var(--color-steel)";

  return (
    <div
      className="-mt-px border border-t-0 border-ink bg-surface"
      style={{ borderLeft: `4px solid ${railColor}` }}
    >
      <Where finding={finding} t={t} onOpenEvidence={onOpenEvidence} />
      {finding.kind === "manual-review" ? (
        <HowToCheck ruleId={finding.ruleId} t={t} />
      ) : (
        <WhatToChange finding={finding} host={host} t={t} />
      )}
      <Why finding={finding} t={t} />
      <Details finding={finding} t={t} />
    </div>
  );
}

function exampleLines(code: string): { text: string; tone?: "added" | "default" }[] {
  return code.split("\n").map((text) => ({ text, tone: "default" }));
}
