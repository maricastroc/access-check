import { BrandMark, ColorSwatch, Marker, Ruler, SectionKicker, StatusSeal } from "@/components/ui";
import {
  axeRules,
  complementaryPasses,
  exampleFinding,
  exampleMarkdown,
  exampleScore,
  steps,
} from "./content";
import { UrlForm } from "./url-form";
import { CapturePreview } from "./evidence-preview";

/** Section header with a short steel rule — the landing's one brand accent. */
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
      <span aria-hidden className="mb-2.5 block h-[3px] w-10 bg-steel" />
      <SectionKicker>{kicker}</SectionKicker>
      <h2 className="mt-1.5 max-w-[18ch] text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

const STAGE_LABEL = ["Open", "Locate", "Verify"];

function StageArtifact({ i }: { i: number }) {
  if (i === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 border border-hairline bg-code px-2.5 py-1.5 font-mono text-[11.5px]">
          <span className="text-muted">https://</span>
          <span className="text-ink">aurora-coffee.com</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span aria-hidden className="text-verified">✓</span>
          Chromium · axe-core injected · content settled
        </div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="relative h-[70px] overflow-hidden border border-hairline" style={{ background: "#FBFAF7" }}>
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
              <Marker n={1} state="selected" label="2.1:1" size={22} ariaLabel="Located occurrence" />
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
        <span aria-hidden className="text-muted">→</span>
        <ColorSwatch hex={exampleFinding.toHex} size={14} />
        <span className="font-mono text-[11px] text-ink">#2F6B57</span>
        <span className="font-cond text-verified">4.62:1</span>
      </div>
      <StatusSeal status="verified">Verified in sandbox</StatusSeal>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-band">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead kicker="How it works" title="One page, opened, located and verified" />
          <p className="font-cond text-[15px] tracking-[0.04em] text-muted">
            <span className="text-serious">Open</span> → <span className="text-serious">Locate</span>{" "}
            → <span className="text-verified">Verify</span>
          </p>
        </div>

        <div className="relative mt-9">
          {/* the path connecting the three stages, visible in the gutters */}
          <div
            aria-hidden
            className="absolute top-[42px] left-[16.6%] right-[16.6%] hidden h-px bg-serious/50 md:block"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((s, i) => {
              const tone = s.tone === "verified" ? "var(--color-verified)" : "var(--color-serious)";
              return (
                <div key={s.n} className="relative flex flex-col border border-border bg-surface p-5">
                  {i > 0 && (
                    <>
                      <span
                        aria-hidden
                        className="absolute top-[32px] -left-[13px] hidden font-cond text-[17px] leading-none text-serious md:block"
                      >
                        →
                      </span>
                      <span
                        aria-hidden
                        className="absolute -top-[15px] left-1/2 -translate-x-1/2 font-cond text-[17px] leading-none text-serious md:hidden"
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
                    <SectionKicker tone="ink">{STAGE_LABEL[i]}</SectionKicker>
                  </div>
                  <div className="mt-4 min-h-[92px]">
                    <StageArtifact i={i} />
                  </div>
                  <h3 className="mt-4 text-[16.5px] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-normal text-body">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Checks included ───────────────────────── */

export function ChecksIncluded() {
  return (
    <section id="checks" className="bg-canvas">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <SectionHead
          kicker="Checks included"
          title="Every axe rule, plus the passes it can't run alone"
        />

        <div className="mt-9 grid grid-cols-1 md:grid-cols-2">
          {/* axe-core rules — objective */}
          <div className="border border-ink bg-surface">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-3">
              <SectionKicker tone="steel">axe-core rules</SectionKicker>
              <span className="text-[12px] text-muted">pass / fail objectively</span>
            </div>
            <div className="flex items-end gap-3 px-5 pt-5">
              <span className="font-cond text-[52px] leading-[0.8] tabular-nums text-ink">
                {axeRules.length}
              </span>
              <span className="pb-2 text-[13px] leading-tight text-muted">
                success criteria
                <br />
                checked automatically
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-y-2.5 px-5 py-5">
              {axeRules.map((r) => (
                <li key={r.sc} className="grid grid-cols-[52px_1fr] items-baseline gap-3">
                  <span className="font-mono text-[13px] text-steel tabular-nums">{r.sc}</span>
                  <span className="text-[13.5px] text-body">{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* complementary passes — judgment */}
          <div className="border border-ink bg-band md:border-l-0">
            <div className="flex items-baseline justify-between border-b border-ink px-5 py-3">
              <SectionKicker tone="steel">complementary passes</SectionKicker>
              <span className="text-[12px] text-muted">what axe can&apos;t do alone</span>
            </div>
            <div className="flex items-end gap-3 px-5 pt-5">
              <span className="font-cond text-[52px] leading-[0.8] tabular-nums text-ink">
                {complementaryPasses.length}
              </span>
              <span className="pb-2 text-[13px] leading-tight text-muted">
                passes beyond
                <br />
                the static DOM
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-y-2.5 px-5 py-5">
              {complementaryPasses.map((p) => (
                <li key={p.label} className="grid grid-cols-[86px_1fr] items-baseline gap-3">
                  <span className="font-cond text-[11px] tracking-[0.1em] text-steel uppercase">
                    {p.label}
                  </span>
                  <span className="text-[13.5px] text-body">{p.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Evidence Lens (peak) ───────────────────────── */

export function EvidenceLensSection() {
  return (
    <section id="evidence" className="bg-band">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <span aria-hidden className="mb-3 block h-[3px] w-10 bg-steel" />
            <h2 className="text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink">
              See the barrier on the element that caused it
            </h2>
          </div>
          <p className="max-w-[46ch] text-[16px] leading-[1.55] text-body">
            Element, selector, measure and diagnosis are one chain. Select the violation and its
            marker fills; the active occurrence is labelled with the ratio, its siblings stay in a
            dashed outline — the distinction never depends on color.
          </p>
        </div>

        {/* the instrument — only the capture is framed; the diagnosis escapes it */}
        <div className="mt-8 grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="border border-ink bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-ink px-4 py-2.5">
              <SectionKicker>Evidence Lens · aurora-coffee.com · 1200 × 800 · scale 43%</SectionKicker>
              <div className="hidden items-stretch border border-border text-[12px] sm:flex">
                <span className="bg-ink px-2.5 py-1 font-medium text-surface">Normal</span>
                <span className="border-l border-border px-2.5 py-1 text-muted">Deuteranopia</span>
                <span className="border-l border-border px-2.5 py-1 text-muted">Grayscale</span>
              </div>
            </div>
            <CapturePreview height={340} />
          </div>

          {/* diagnosis — un-boxed, chained across the boundary to the marker */}
          <div className="relative pt-8 lg:pt-2 lg:pl-8">
            {/* leader: crosses from the capture (left) into the diagnosis */}
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="-ml-8 hidden h-px w-8 border-t border-dashed border-steel lg:block"
              />
              <span
                aria-hidden
                className="flex size-[20px] shrink-0 items-center justify-center bg-ink font-cond text-[12px] font-semibold text-surface"
              >
                1
              </span>
              <span aria-hidden className="h-px flex-1 border-t border-dashed border-steel" />
              <span className="font-mono text-[12px] text-steel">a.hero__cta</span>
            </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="font-cond text-[11px] tracking-[0.1em] text-serious uppercase">Serious</span>
                <span className="ml-auto font-mono text-[12px] text-steel">1.4.3 AA</span>
              </div>
              <h3 className="mt-1.5 text-[16px] font-semibold text-ink">{exampleFinding.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-normal text-ink-2">
                The white label on the light-green button disappears for low-vision users and anyone
                in bright light — and it&apos;s the purchase button.
              </p>

              <div className="mt-4 border-t border-hairline pt-3">
                <SectionKicker>Measurement</SectionKicker>
                <div className="mt-1.5 flex items-end gap-2">
                  <span className="font-cond text-[30px] leading-none tabular-nums text-serious">2.1:1</span>
                  <span className="pb-1 text-[12px] text-muted">min AA 4.5:1 · corrected 4.62:1</span>
                </div>
                <div className="mt-2">
                  <Ruler variant="ratio" found={exampleFinding.measured} required={exampleFinding.required} fixed={exampleFinding.fixed} height={16} />
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-3">
                <SectionKicker>Suggested fix</SectionKicker>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                  <ColorSwatch hex={exampleFinding.fromHex} size={14} />
                  <span className="font-mono text-[11.5px] text-muted line-through">#8FB8A8</span>
                  <span aria-hidden className="text-muted">→</span>
                  <ColorSwatch hex={exampleFinding.toHex} size={14} />
                  <span className="font-mono text-[11.5px] text-ink">#2F6B57</span>
                  <span className="text-muted">(color)</span>
                </div>
                <div className="mt-3">
                  <StatusSeal status="verified" />
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Tested in a sandbox copy. aurora-coffee.com was not altered.
                </p>
              </div>
            </div>
          </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1.5 text-[13px] text-muted">
          <span>
            <span className="font-cond text-serious">2.1:1</span> the measure found
          </span>
          <span>
            <span className="font-mono text-steel">a.hero__cta</span> the exact selector
          </span>
          <span>
            <span className="font-cond text-verified">Sandbox</span> re-audited in a copy
          </span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Sandbox (before → verified) ───────────────────────── */

function BeatButton({ hex, ratio, tone }: { hex: string; ratio: string; tone: "serious" | "verified" }) {
  return (
    <div>
      <div
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

export function SandboxSection() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <SectionHead
            kicker="Sandbox verification"
            title="Every fix is proved on a copy — your site is never touched"
          />
          <p className="max-w-[52ch] text-[16px] leading-[1.55] text-body">
            The change is applied to the copy&apos;s DOM, the rule runs again, and the change is
            reverted. If it stops flagging, the fix is labelled verified — never a certainty, and
            never a touch on your site.
          </p>
        </div>

        {/* the measurement instrument */}
        <div className="mt-8 border border-ink bg-surface">
          <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
            <SectionKicker>Contrast measurement · 1.4.3 AA</SectionKicker>
            <span className="font-mono text-[12px] text-steel">a.hero__cta</span>
          </div>

          <div className="p-6">
            <div className="flex items-end gap-3">
              <span className="font-cond text-[52px] leading-[0.8] tabular-nums text-serious">2.1:1</span>
              <span className="pb-2 text-[13px] text-muted">
                found · minimum for normal text is {exampleFinding.required}:1
              </span>
            </div>
            <div className="mt-3">
              <Ruler variant="ratio" found={exampleFinding.measured} required={exampleFinding.required} fixed={exampleFinding.fixed} height={22} />
            </div>

            {/* three beats aligned under the ruler */}
            <div className="mt-9 grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <SectionKicker tone="steel">Before</SectionKicker>
                <div className="mt-2">
                  <BeatButton hex={exampleFinding.fromHex} ratio="2.1:1" tone="serious" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 text-muted">
                <span aria-hidden className="font-cond text-[22px] text-serious">→</span>
                <span className="max-w-[16ch] text-center text-[11px] leading-tight">
                  nearest passing lightness, same hue
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <SectionKicker tone="steel" className="!text-verified">After</SectionKicker>
                  <StatusSeal status="verified">Verified</StatusSeal>
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

/* ───────────────────────── Export (two artifacts) ───────────────────────── */

function MiniPdf() {
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
          Internal priority score
        </span>
        <div className="mt-0.5 flex items-end gap-1.5">
          <span className="font-cond text-[34px] leading-[0.8] tabular-nums text-ink">
            {exampleScore.score}
          </span>
          <span className="pb-1 font-cond text-[11px] text-muted">/100</span>
        </div>
        <div className="mt-2">
          <Ruler variant="score" score={exampleScore.score} deductions={exampleScore.deductions} height={14} />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="border-l-2 border-serious bg-band px-2 py-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-cond tracking-[0.08em] text-serious uppercase">Serious</span>
            <span className="font-mono text-steel">1.4.3</span>
          </div>
          <div className="text-[10px] font-semibold text-ink">Text below minimum contrast</div>
        </div>
        <div className="border-l-2 border-moderate bg-band px-2 py-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-cond tracking-[0.08em] text-moderate-text uppercase">Moderate</span>
            <span className="font-mono text-steel">1.3.1</span>
          </div>
          <div className="text-[10px] font-semibold text-ink">Heading level skips</div>
        </div>
      </div>
    </div>
  );
}

export function ExportSection() {
  return (
    <section className="bg-band">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <SectionHead
          kicker="Export"
          title="Two results for two readers — whoever decides, whoever fixes"
        />

        <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* PDF — for whoever decides */}
          <div className="grid grid-cols-[180px_1fr] gap-5">
            <MiniPdf />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-cond text-[10px] tracking-[0.1em] text-ink uppercase">
                  PDF
                </span>
                <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
                  for whoever decides
                </span>
              </div>
              <h3 className="mt-2.5 text-[17px] font-semibold text-ink">Score, ruler and impact in plain language</h3>
              <p className="mt-1.5 text-[14px] leading-normal text-body">
                Summary, severities and the findings with human impact — to send to a client or a
                product team, no engineering context required.
              </p>
            </div>
          </div>

          {/* Markdown — for whoever fixes */}
          <div className="grid grid-cols-[1fr] gap-5 sm:grid-cols-[1fr_180px] sm:[&>*:first-child]:order-2">
            <div className="border border-ink bg-surface">
              <div className="flex items-center gap-2 border-b border-hairline px-3 py-1.5">
                <span aria-hidden className="size-2 bg-steel" />
                <span className="font-mono text-[10.5px] text-muted">accesscheck-aurora-coffee-com.md</span>
              </div>
              <div className="bg-code px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
                {exampleMarkdown.split("\n").map((text, i) => (
                  <div
                    key={i}
                    className={
                      text.startsWith("###")
                        ? "text-muted"
                        : text.includes("verified")
                          ? "text-verified"
                          : "text-[#2b2b2d]"
                    }
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-border bg-surface px-1.5 py-0.5 font-cond text-[10px] tracking-[0.1em] text-ink uppercase">
                  MD
                </span>
                <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
                  for whoever fixes
                </span>
              </div>
              <h3 className="mt-2.5 text-[17px] font-semibold text-ink">Selector, snippet and verification status</h3>
              <p className="mt-1.5 text-[14px] leading-normal text-body">
                Severity table and a prioritized list, ready to paste into an issue or a PR — the
                verified line already marked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Final CTA (finale) ───────────────────────── */

export function FinalCta() {
  return (
    <section className="bg-ink text-surface">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        {/* a signature line recovering the page's motifs */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-ink-2 pb-6 font-cond text-[13px] tracking-[0.06em] uppercase">
          <span className="flex items-center gap-2 text-serious">
            <span aria-hidden className="hatch-serious size-2.5" /> Measured
          </span>
          <span className="flex items-center gap-2 text-steel">
            <span aria-hidden className="size-2.5 bg-steel" /> Located
          </span>
          <span className="flex items-center gap-2 text-verified">
            <span aria-hidden className="size-2.5 bg-verified" /> Verified
          </span>
          <span className="ml-auto font-sans text-[12px] tracking-normal text-disabled normal-case">
            axe-core · Playwright · WCAG A &amp; AA
          </span>
        </div>

        <div className="grid grid-cols-1 gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center">
          <div>
            <h2 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.02em]">
              Measure a page now and see where the barrier is
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-normal text-band">
              No account, no extension, no change to the site. The report is ready in under half a
              minute and leaves as PDF or Markdown.
            </p>
          </div>
          <div>
            <UrlForm accent examples={["wikipedia.org", "stripe.com", "github.com"]} />
            <p className="mt-3 text-[13px] text-disabled">
              We audit public pages only. Internal and private addresses are refused.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-2">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-6 py-6 text-[13px] text-disabled sm:flex-row sm:items-center sm:justify-between">
          <span>AccessCheck · axe-core · Playwright · WCAG 2.0 / 2.1 / 2.2 levels A and AA</span>
          <span>Internal score · not a conformance statement</span>
        </div>
      </div>
    </section>
  );
}
