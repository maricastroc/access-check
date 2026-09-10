import { BrandMark, ColorSwatch, Marker, Ruler, SectionKicker, StatusSeal } from "@/components/ui";
import {
  axeRules,
  complementaryPasses,
  exampleFinding,
  exampleMarkdownKeys,
  exampleScore,
  exampleTimeline,
  steps,
  type TimelineEntry,
} from "./content";
import { UrlForm } from "./url-form";
import { CapturePreview } from "./evidence-preview";
import type { MessageKey, Translate } from "@/lib/i18n/t";
import type { Severity } from "@/lib/scan/types";

function SectionHead({
  kicker,
  title,
  className,
}: {
  kicker: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span aria-hidden className="mb-2.5 block h-0.75 w-10 bg-steel" />
      <SectionKicker>{kicker}</SectionKicker>
      <h2 className="mt-1.5 max-w-[18ch] text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
    </div>
  );
}

const STAGE_LABEL_KEY: MessageKey[] = ["home.stage.open", "home.stage.locate", "home.stage.verify"];

function StageArtifact({ i, t }: { i: number; t: Translate }) {
  if (i === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 border border-hairline bg-code px-2.5 py-1.5 font-mono text-[11.5px]">
          <span className="text-muted">https://</span>
          <span className="text-ink">aurora-coffee.com</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span aria-hidden className="text-verified">
            ✓
          </span>
          {t("home.stage.browserReady")}
        </div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div
        aria-hidden
        inert
        className="relative h-17.5 overflow-hidden border border-hairline"
        style={{ background: "#FBFAF7" }}
      >
        <div className="px-3 pt-3">
          <div className="h-2 w-16 bg-ink/70" />
          <span className="relative mt-3 inline-block">
            <span
              aria-hidden
              className="absolute -inset-1 border-2"
              style={{ borderColor: "var(--color-ink)", background: "rgba(168,90,6,.10)" }}
            />
            <span
              className="relative block px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: "#8fb8a8" }}
            >
              Order now
            </span>
            <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
              <Marker
                n={1}
                state="selected"
                label="2.1:1"
                size={22}
                ariaLabel={t("home.lens.locatedOccurrence")}
              />
            </span>
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[12px]">
        <ColorSwatch hex={exampleFinding.fromHex} size={14} />
        <span className="font-mono text-[11px] text-muted line-through">#8FB8A8</span>
        <span aria-hidden className="text-muted">
          →
        </span>
        <ColorSwatch hex={exampleFinding.toHex} size={14} />
        <span className="font-mono text-[11px] text-ink">#2F6B57</span>
        <span className="font-cond text-verified">4.62:1</span>
      </div>
      <StatusSeal t={t} status="verified">
        {t("home.lens.verifiedInSandbox")}
      </StatusSeal>
    </div>
  );
}

export function HowItWorks({ t }: { t: Translate }) {
  return (
    <section id="how" className="bg-band">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead kicker={t("home.howItWorks.kicker")} title={t("home.howItWorks.title")} />
          <p className="font-cond text-[15px] tracking-[0.04em] text-muted">
            <span className="text-serious">{t("home.stage.open")}</span> →{" "}
            <span className="text-serious">{t("home.stage.locate")}</span> →{" "}
            <span className="text-verified">{t("home.stage.verify")}</span>
          </p>
        </div>

        <div className="relative mt-9">
          <div
            aria-hidden
            className="absolute top-10.5 right-[16.6%] left-[16.6%] hidden h-px bg-serious/50 md:block"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s, i) => {
              const tone = s.tone === "verified" ? "var(--color-verified)" : "var(--color-serious)";
              return (
                <div
                  key={s.n}
                  className="relative flex flex-col border border-border bg-surface p-5"
                >
                  {i > 0 && (
                    <>
                      <span
                        aria-hidden
                        className="absolute top-8 -left-3.25 hidden font-cond text-[17px] leading-none text-serious md:block"
                      >
                        →
                      </span>
                      <span
                        aria-hidden
                        className="absolute -top-3.75 left-1/2 -translate-x-1/2 font-cond text-[17px] leading-none text-serious md:hidden"
                      >
                        ↓
                      </span>
                    </>
                  )}
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-cond text-[56px] leading-[0.8] font-semibold tabular-nums"
                      style={{ color: tone }}
                    >
                      {s.n}
                    </span>
                    <SectionKicker tone="ink">{t(STAGE_LABEL_KEY[i])}</SectionKicker>
                  </div>
                  <div className="mt-4 min-h-23">
                    <StageArtifact i={i} t={t} />
                  </div>
                  <h3 className="mt-4 text-[16.5px] font-semibold text-ink">{t(s.title)}</h3>
                  <p className="mt-1.5 text-[14px] leading-normal text-body">{t(s.body)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChecksIncluded({ t }: { t: Translate }) {
  return (
    <section id="checks" className="bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <SectionHead kicker={t("home.checks.kicker")} title={t("home.checks.title")} />

        <div className="mt-9 grid grid-cols-1 md:grid-cols-2">
          <div className="border border-ink bg-surface">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-3">
              <SectionKicker tone="steel">{t("home.axeRules.kicker")}</SectionKicker>
              <span className="text-[12px] text-muted">{t("home.axeRules.note")}</span>
            </div>
            <div className="flex items-end gap-3 px-5 pt-5">
              <span className="font-cond text-[52px] leading-[0.8] text-ink tabular-nums">
                {axeRules.length}
              </span>
              <span className="pb-2 text-[13px] leading-tight text-muted">
                {t("home.axeRules.countLine1")}
                <br />
                {t("home.axeRules.countLine2")}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-y-2.5 px-5 py-5">
              {axeRules.map((r) => (
                <li key={r.sc} className="grid grid-cols-[52px_1fr] items-baseline gap-3">
                  <span className="font-mono text-[13px] text-steel tabular-nums">{r.sc}</span>
                  <span className="text-[13.5px] text-body">{t(r.label)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-ink bg-band md:border-l-0">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-3">
              <SectionKicker tone="steel">{t("home.complementary.kicker")}</SectionKicker>
              <span className="text-[12px] text-muted">{t("home.complementary.note")}</span>
            </div>
            <div className="flex items-end gap-3 px-5 pt-5">
              <span className="font-cond text-[52px] leading-[0.8] text-ink tabular-nums">
                {complementaryPasses.length}
              </span>
              <span className="pb-2 text-[13px] leading-tight text-muted">
                {t("home.complementary.countLine1")}
                <br />
                {t("home.complementary.countLine2")}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-y-2.5 px-5 py-5">
              {complementaryPasses.map((p) => (
                <li key={p.label} className="grid grid-cols-[86px_1fr] items-baseline gap-3">
                  <span className="font-cond text-[11px] tracking-widest text-steel uppercase">
                    {t(p.label)}
                  </span>
                  <span className="text-[13.5px] text-body">{t(p.desc)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EvidenceLensSection({ t }: { t: Translate }) {
  return (
    <section id="evidence" className="bg-band">
      <div className="mx-auto w-full max-w-300 px-6 py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <span aria-hidden className="mb-3 block h-0.75 w-10 bg-steel" />
            <h2 className="text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
              {t("home.lens.title")}
            </h2>
          </div>
          <p className="max-w-[46ch] text-[16px] leading-[1.55] text-body">{t("home.lens.body")}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="border border-ink bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-ink px-4 py-2.5">
              <SectionKicker>{t("home.lens.frameLabelFull")}</SectionKicker>
              <div className="hidden items-stretch border border-border text-[12px] sm:flex">
                <span className="bg-ink px-2.5 py-1 font-medium text-surface">
                  {t("vision.normal")}
                </span>
                <span className="border-l border-border px-2.5 py-1 text-muted">
                  {t("vision.deuteranopia")}
                </span>
                <span className="border-l border-border px-2.5 py-1 text-muted">
                  {t("vision.grayscale")}
                </span>
              </div>
            </div>
            <CapturePreview t={t} height={340} />
          </div>

          <div className="relative pt-8 lg:pt-2 lg:pl-8">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="-ml-8 hidden h-px w-8 border-t border-dashed border-steel lg:block"
              />
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center bg-ink font-cond text-[12px] font-semibold text-surface"
              >
                1
              </span>
              <span aria-hidden className="h-px flex-1 border-t border-dashed border-steel" />
              <span className="font-mono text-[12px] text-steel">a.hero__cta</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="font-cond text-[11px] tracking-widest text-serious uppercase">
                {t("severity.serious")}
              </span>
              <span className="ml-auto font-mono text-[12px] text-steel">1.4.3 AA</span>
            </div>
            <h3 className="mt-1.5 text-[16px] font-semibold text-ink">{t(exampleFinding.title)}</h3>
            <p className="mt-1.5 text-[13.5px] leading-normal text-ink-2">
              {t("home.lens.contrastStory")}
            </p>

            <div className="mt-4 border-t border-hairline pt-3">
              <SectionKicker>{t("home.lens.measurement")}</SectionKicker>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="font-cond text-[30px] leading-none text-serious tabular-nums">
                  2.1:1
                </span>
                <span className="pb-1 text-[12px] text-muted">
                  {t("ratio.minAAWithFix", {
                    required: exampleFinding.required.toFixed(1),
                    fixed: exampleFinding.fixed.toFixed(2),
                  })}
                </span>
              </div>
              <div className="mt-2">
                <Ruler
                  t={t}
                  variant="ratio"
                  found={exampleFinding.measured}
                  required={exampleFinding.required}
                  fixed={exampleFinding.fixed}
                  height={16}
                />
              </div>
            </div>

            <div className="mt-4 border-t border-hairline pt-3">
              <SectionKicker>{t("home.lens.suggestedFix")}</SectionKicker>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                <ColorSwatch hex={exampleFinding.fromHex} size={14} />
                <span className="font-mono text-[11.5px] text-muted line-through">#8FB8A8</span>
                <span aria-hidden className="text-muted">
                  →
                </span>
                <ColorSwatch hex={exampleFinding.toHex} size={14} />
                <span className="font-mono text-[11.5px] text-ink">#2F6B57</span>
                <span className="text-muted">(color)</span>
              </div>
              <div className="mt-3">
                <StatusSeal t={t} status="verified" />
              </div>
              <p className="mt-2 text-[12px] text-muted">{t("home.lens.sandboxNote")}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1.5 text-[13px] text-muted">
          <span>
            <span className="font-cond text-serious">2.1:1</span> {t("home.lens.measureFound")}
          </span>
          <span>
            <span className="font-mono text-steel">a.hero__cta</span> {t("home.lens.exactSelector")}
          </span>
          <span>
            <span className="font-cond text-verified">{t("home.lens.sandbox")}</span>{" "}
            {t("home.lens.reauditedInCopy")}
          </span>
        </div>
      </div>
    </section>
  );
}

function BeatButton({
  hex,
  ratio,
  tone,
}: {
  hex: string;
  ratio: string;
  tone: "serious" | "verified";
}) {
  return (
    <div>
      <div
        aria-hidden
        inert
        className="flex h-11 items-center justify-center text-[13px] font-semibold text-white"
        style={{ background: hex }}
      >
        Order now
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
          <ColorSwatch hex={hex} size={12} /> {hex.toUpperCase()}
        </span>
        <span
          className="font-cond text-[15px] font-semibold"
          style={{ color: tone === "verified" ? "var(--color-verified)" : "var(--color-serious)" }}
        >
          {ratio}
        </span>
      </div>
    </div>
  );
}

export function SandboxSection({ t }: { t: Translate }) {
  return (
    <section className="bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6 py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <SectionHead kicker={t("home.sandbox.kicker")} title={t("home.sandbox.title")} />
          <p className="max-w-[52ch] text-[16px] leading-[1.55] text-body">
            {t("home.sandbox.body")}
          </p>
        </div>

        <div className="mt-8 border border-ink bg-surface">
          <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
            <SectionKicker>{t("home.sandbox.measurement")}</SectionKicker>
            <span className="font-mono text-[12px] text-steel">a.hero__cta</span>
          </div>

          <div className="p-6">
            <div className="flex items-end gap-3">
              <span className="font-cond text-[52px] leading-[0.8] text-serious tabular-nums">
                2.1:1
              </span>
              <span className="pb-2 text-[13px] text-muted">
                {t("home.sandbox.found", { required: exampleFinding.required })}
              </span>
            </div>
            <div className="mt-3">
              <Ruler
                t={t}
                variant="ratio"
                found={exampleFinding.measured}
                required={exampleFinding.required}
                fixed={exampleFinding.fixed}
                height={22}
              />
            </div>

            <div className="mt-9 grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <SectionKicker tone="steel">{t("home.lens.before")}</SectionKicker>
                <div className="mt-2">
                  <BeatButton hex={exampleFinding.fromHex} ratio="2.1:1" tone="serious" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 text-muted">
                <span aria-hidden className="font-cond text-[22px] text-serious">
                  →
                </span>
                <span className="max-w-[16ch] text-center text-[11px] leading-tight">
                  {t("home.sandbox.nearestPassing")}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <SectionKicker tone="steel" className="text-verified!">
                    {t("home.lens.after")}
                  </SectionKicker>
                  <StatusSeal t={t} status="verified">
                    {t("home.cta.verified")}
                  </StatusSeal>
                </div>
                <div className="mt-2">
                  <BeatButton hex={exampleFinding.toHex} ratio="4.62:1" tone="verified" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniPdf({ t }: { t: Translate }) {
  return (
    <div className="border border-ink bg-surface p-4">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <span className="flex items-center gap-1.5">
          <BrandMark size={13} />
          <span className="text-[10px] font-semibold text-ink">AccessCheck</span>
        </span>
        <span className="font-mono text-[8.5px] text-muted">aurora-coffee.com</span>
      </div>
      <div className="mt-3">
        <span className="font-cond text-[8.5px] tracking-[0.12em] text-muted uppercase">
          {t("report.internalScore")}
        </span>
        <div className="mt-0.5 flex items-end gap-1.5">
          <span className="font-cond text-[34px] leading-[0.8] text-ink tabular-nums">
            {exampleScore.score}
          </span>
          <span className="pb-1 font-cond text-[11px] text-muted">/100</span>
        </div>
        <div className="mt-2">
          <Ruler
            t={t}
            variant="score"
            score={exampleScore.score}
            deductions={exampleScore.deductions}
            height={14}
          />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="border-l-2 border-serious bg-band px-2 py-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-cond tracking-[0.08em] text-serious uppercase">
              {t("severity.serious")}
            </span>
            <span className="font-mono text-steel">1.4.3</span>
          </div>
          <div className="text-[10px] font-semibold text-ink">{t("home.example.title")}</div>
        </div>
        <div className="border-l-2 border-moderate bg-band px-2 py-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-cond tracking-[0.08em] text-moderate-text uppercase">
              {t("severity.moderate")}
            </span>
            <span className="font-mono text-steel">1.3.1</span>
          </div>
          <div className="text-[10px] font-semibold text-ink">{t("home.example.headingSkip")}</div>
        </div>
      </div>
    </div>
  );
}

export function ExportSection({ t }: { t: Translate }) {
  return (
    <section className="bg-band">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <SectionHead kicker={t("home.export.kicker")} title={t("home.export.title")} />

        <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="grid grid-cols-[180px_1fr] gap-5">
            <MiniPdf t={t} />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-cond text-[10px] tracking-widest text-ink uppercase">
                  PDF
                </span>
                <span className="font-cond text-[11px] tracking-widest text-muted uppercase">
                  {t("home.export.pdfFor")}
                </span>
              </div>
              <h3 className="mt-2.5 text-[17px] font-semibold text-ink">
                {t("home.export.pdfTitle")}
              </h3>
              <p className="mt-1.5 text-[14px] leading-normal text-body">
                {t("home.export.pdfBody")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr] gap-5 sm:grid-cols-[1fr_180px] sm:[&>*:first-child]:order-2">
            <div className="border border-ink bg-surface">
              <div className="flex items-center gap-2 border-b border-hairline px-3 py-1.5">
                <span aria-hidden className="size-2 bg-steel" />
                <span className="font-mono text-[10.5px] text-muted">{t("home.md.filename")}</span>
              </div>
              <div className="bg-code px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
                {exampleMarkdownKeys.map((key, i) => {
                  const text = t(key);
                  const tone = key === "home.md.line5" ? "text-muted" : "text-[#2b2b2d]";
                  return (
                    <div key={i} className={key === "home.md.line6" ? "text-verified" : tone}>
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-cond text-[10px] tracking-widest text-ink uppercase">
                  MD
                </span>
                <span className="font-cond text-[11px] tracking-widest text-muted uppercase">
                  {t("home.export.mdFor")}
                </span>
              </div>
              <h3 className="mt-2.5 text-[17px] font-semibold text-ink">
                {t("home.export.mdTitle")}
              </h3>
              <p className="mt-1.5 text-[14px] leading-normal text-body">
                {t("home.export.mdBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TIMELINE_DOT: Record<Severity, string> = {
  critical: "bg-critical",
  serious: "bg-serious",
  moderate: "bg-moderate",
  minor: "bg-steel",
};

function AuditStamp({
  label,
  score,
  dim,
  delta,
}: {
  label: string;
  score: number;
  dim?: boolean;
  delta?: number;
}) {
  return (
    <div className="px-5 py-5">
      <SectionKicker tone="steel">{label}</SectionKicker>
      <div className="mt-1.5 flex items-end gap-2.5">
        <span
          className={`font-cond text-[44px] leading-[0.8] tabular-nums ${dim ? "text-muted" : "text-ink"}`}
        >
          {score}
        </span>
        <span className="pb-1 font-cond text-[13px] text-muted">/100</span>
        {delta !== undefined && (
          <span className="mb-0.5 ml-auto inline-flex items-center gap-1.5 border border-verified bg-verified/[0.08] px-2 py-1 font-cond text-[13px] tracking-[0.04em] text-verified tabular-nums">
            <span aria-hidden>▲</span>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </div>
  );
}

function TimelineList({
  kicker,
  glyph,
  tone,
  items,
  empty,
  className,
  t,
}: {
  kicker: string;
  glyph: string;
  tone: "verified" | "critical";
  items: TimelineEntry[];
  empty: string;
  className?: string;
  t: Translate;
}) {
  const toneClass =
    tone === "verified" ? "border-verified text-verified" : "border-critical text-critical";

  return (
    <div className={className}>
      <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3">
        <span
          aria-hidden
          className={`inline-flex size-5 items-center justify-center border font-cond text-[12px] ${toneClass}`}
        >
          {glyph}
        </span>
        <SectionKicker tone="ink">{kicker}</SectionKicker>
        <span className="ml-auto font-cond text-[15px] text-muted tabular-nums">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-y-2.5 px-5 py-4">
          {items.map((v) => (
            <li key={v.sc} className="grid grid-cols-[52px_1fr] items-center gap-3">
              <span className="font-mono text-[13px] text-steel tabular-nums">{v.sc}</span>
              <span className="flex items-center gap-2 text-[13.5px] text-body">
                <span aria-hidden className={`size-1.5 shrink-0 ${TIMELINE_DOT[v.severity]}`} />
                <span>{t(v.label)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrackOverTimeSection({ t }: { t: Translate }) {
  const { fromScore, toScore, daysApart, fixed, regressed } = exampleTimeline;

  return (
    <section id="track" className="bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead kicker={t("home.track.kicker")} title={t("home.track.title")} />
          <p className="max-w-[46ch] text-[14px] leading-normal text-body">
            {t("home.track.body")}
          </p>
        </div>

        <div className="mt-9 border border-ink bg-surface">
          <div className="grid grid-cols-1 border-b border-ink sm:grid-cols-[1fr_auto_1fr]">
            <AuditStamp label={t("home.track.previousAudit")} score={fromScore} dim />
            <div className="flex items-center justify-center gap-2 border-y border-hairline px-5 py-3 sm:flex-col sm:gap-1 sm:border-x sm:border-y-0 sm:px-6">
              <span
                aria-hidden
                className="rotate-90 font-cond text-[22px] leading-none text-steel sm:rotate-0"
              >
                →
              </span>
              <span className="text-center text-[11px] leading-tight text-muted">
                {t("home.track.daysLater", { count: daysApart })}
              </span>
            </div>
            <AuditStamp
              label={t("home.track.thisAudit")}
              score={toScore}
              delta={toScore - fromScore}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <TimelineList
              t={t}
              kicker={t("diff.cleared")}
              glyph="✓"
              tone="verified"
              items={fixed}
              empty={t("diff.noneCleared")}
            />
            <TimelineList
              t={t}
              kicker={t("diff.newOrWorse")}
              glyph="!"
              tone="critical"
              items={regressed}
              empty={t("diff.noneWorse")}
              className="border-t border-hairline md:border-t-0 md:border-l"
            />
          </div>
        </div>

        <p className="mt-4 max-w-[70ch] text-[13px] leading-normal text-muted">
          {t("home.track.note")}
        </p>
      </div>
    </section>
  );
}

export function FinalCta({ t }: { t: Translate }) {
  return (
    <section className="bg-ink text-surface">
      <div className="mx-auto w-full max-w-300 px-6 py-16">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-ink-2 pb-6 font-cond text-[13px] tracking-[0.06em] text-band uppercase">
          <span className="flex items-center gap-2">
            <span aria-hidden className="hatch-serious size-2.5" /> {t("home.cta.measured")}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 bg-steel" /> {t("home.cta.located")}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 bg-verified" /> {t("home.cta.verified")}
          </span>
          <span className="ml-auto font-sans text-[12px] tracking-normal text-disabled normal-case">
            {t("home.footerStandards")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center">
          <div>
            <h2 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.02em]">
              {t("home.cta.title")}
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-normal text-band">
              {t("home.cta.body")}
            </p>
          </div>
          <div>
            <UrlForm accent examples={["wikipedia.org", "stripe.com", "github.com"]} />
            <p className="mt-3 text-[13px] text-disabled">{t("home.cta.publicOnly")}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-2">
        <div className="mx-auto flex w-full max-w-300 flex-col gap-2 px-6 py-6 text-[13px] text-disabled sm:flex-row sm:items-center sm:justify-between">
          <span>{t("home.cta.standards")}</span>
          <span>{t("home.cta.notConformance")}</span>
        </div>
      </div>
    </section>
  );
}
