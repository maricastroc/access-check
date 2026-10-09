import { SectionKicker } from "@/components/ui";
import { NodeGlyph } from "@/components/investigation";
import { axeRules, complementaryPasses, exampleFinding, steps } from "./content";
import { UrlForm } from "./url-form";
import {
  DEMO_SELECTOR,
  DemoChain,
  DemoFixTest,
  DemoLocateStage,
  DemoMarkdown,
  DemoScreenshot,
  DemoTestStage,
  MiniReport,
} from "./demo";
import type { MessageKey, Translate } from "@/lib/i18n/t";

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
      <SectionKicker variant="section" tone="steel">
        {kicker}
      </SectionKicker>
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
  if (i === 1) return <DemoLocateStage />;
  return <DemoTestStage />;
}

export function HowItWorks({ t }: { t: Translate }) {
  return (
    <section id="how" className="bg-band">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead kicker={t("home.howItWorks.kicker")} title={t("home.howItWorks.title")} />
          <p className="font-cond text-[15px] tracking-[0.04em] text-muted">
            {t("home.stage.open")} → {t("home.stage.locate")} →{" "}
            <span className="text-verified">{t("home.stage.verify")}</span>
          </p>
        </div>

        <div className="relative mt-9">
          <div
            aria-hidden
            className="absolute top-10.5 right-[16.6%] left-[16.6%] hidden h-px bg-border md:block"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s, i) => {
              const tone = s.tone === "verified" ? "var(--color-verified)" : "var(--color-ink)";
              return (
                <div key={s.n} className="relative flex flex-col bg-surface p-5">
                  {i > 0 && (
                    <>
                      <span
                        aria-hidden
                        className="absolute top-8 -left-3.25 hidden font-cond text-[17px] leading-none text-rule md:block"
                      >
                        →
                      </span>
                      <span
                        aria-hidden
                        className="absolute -top-3.75 left-1/2 -translate-x-1/2 font-cond text-[17px] leading-none text-rule md:hidden"
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
          <div className="border border-border bg-surface">
            <div className="flex items-baseline justify-between border-b border-hairline px-5 py-3">
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

          <div className="border border-border bg-band md:border-l-0">
            <div className="flex items-baseline justify-between border-b border-hairline px-5 py-3">
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
                  <span className="text-[12.5px] font-semibold text-steel">{t(p.label)}</span>
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
            <h2 className="text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
              {t("home.lens.title")}
            </h2>
          </div>
          <p className="max-w-[46ch] text-[16px] leading-[1.55] text-body">{t("home.lens.body")}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 border border-hairline lg:grid-cols-[minmax(0,1fr)_400px]">
          <DemoScreenshot sticky label={t("home.lens.frameLabelFull")} />
          <div className="border-t border-hairline bg-canvas lg:border-t-0 lg:border-l">
            <DemoChain />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1.5 text-[13px] text-muted">
          <span>
            <span className="font-mono text-serious-text">
              {exampleFinding.measured.toFixed(2)}:1
            </span>{" "}
            {t("home.lens.measureFound")}
          </span>
          <span>
            <span className="font-mono text-steel">{DEMO_SELECTOR}</span>{" "}
            {t("home.lens.exactSelector")}
          </span>
          <span>
            <span className="font-semibold text-verified">{t("home.lens.sandbox")}</span>{" "}
            {t("home.lens.reauditedInCopy")}
          </span>
        </div>
      </div>
    </section>
  );
}

export function SandboxSection({ t }: { t: Translate }) {
  return (
    <section className="bg-band">
      <div className="mx-auto w-full max-w-300 px-6 py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <SectionHead kicker={t("home.sandbox.kicker")} title={t("home.sandbox.title")} />
          <p className="max-w-[52ch] text-[16px] leading-[1.55] text-body">
            {t("home.sandbox.body")}
          </p>
        </div>

        <div className="mt-8 border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <SectionKicker>{t("home.sandbox.measurement")}</SectionKicker>
            <span className="font-mono text-[12px] text-steel">{DEMO_SELECTOR}</span>
          </div>
          <div className="p-6">
            <DemoFixTest />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExportSection({ t }: { t: Translate }) {
  return (
    <section className="bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6 py-12">
        <SectionHead kicker={t("home.export.kicker")} title={t("home.export.title")} />

        <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="grid grid-cols-[180px_1fr] gap-5">
            <MiniReport />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
                  PDF
                </span>
                <span className="text-[12.5px] font-semibold text-muted">
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

          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
                  MD
                </span>
                <span className="text-[12.5px] font-semibold text-muted">
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
            <div className="border border-hairline bg-surface">
              <div className="flex items-center gap-2 border-b border-hairline px-3 py-1.5">
                <span aria-hidden className="size-2 bg-steel" />
                <span className="font-mono text-[10.5px] text-muted">{t("home.md.filename")}</span>
              </div>
              <DemoMarkdown />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ t }: { t: Translate }) {
  return (
    <section className="bg-ink text-surface">
      <div className="mx-auto w-full max-w-300 px-6 py-16">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-ink-2 pb-6 text-[13.5px] font-semibold text-band">
          <span className="flex items-center gap-2.5">
            <NodeGlyph kind="located" sev="serious" /> {t("home.cta.located")}
          </span>
          <span className="flex items-center gap-2.5">
            <NodeGlyph kind="evidence" sev="serious" /> {t("home.cta.measured")}
          </span>
          <span className="flex items-center gap-2.5">
            <NodeGlyph kind="end" sev="serious" end="tested" /> {t("home.cta.verified")}
          </span>
          <span className="ml-auto text-[12px] font-normal text-disabled">
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
            <UrlForm accent examples={["news.ycombinator.com", "lrb.co.uk", "kinfolk.com"]} />
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
