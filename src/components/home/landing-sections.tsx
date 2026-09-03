import type { FindingView } from "@/lib/report/findings";
import {
  BrowserFrame,
  CodeBlock,
  ColorSwatch,
  FindingDetail,
  FindingRow,
  Marker,
  Ruler,
  SectionKicker,
  StatusSeal,
} from "@/components/ui";
import { ratioPosition } from "@/lib/report/contrast";
import { axeRules, complementaryPasses, exampleFinding, exampleMarkdown, steps } from "./content";
import { UrlForm } from "./url-form";

const demoFinding: FindingView = {
  id: "demo",
  n: 1,
  kind: "wcag",
  isWcag: true,
  severity: "serious",
  passLabel: null,
  title: exampleFinding.title,
  criterionSc: exampleFinding.sc,
  criterionName: exampleFinding.name,
  elements: exampleFinding.elements,
  ruleId: exampleFinding.ruleId,
  desc: "The white label on the light-green button disappears for low-vision users and anyone reading in bright light. It's the purchase button — the barrier sits on the page's main path.",
  who: "Major barrier — many users can't complete the task.",
  fixText: `Set the text color to ${exampleFinding.toHex.toUpperCase()} → ${exampleFinding.fixed}:1.`,
  fixCode: `color: ${exampleFinding.toHex};`,
  fixGroups: null,
  fixStatus: "verified",
  measurement: {
    measured: exampleFinding.measured,
    required: exampleFinding.required,
    fixed: exampleFinding.fixed,
    fromHex: exampleFinding.fromHex,
    toHex: exampleFinding.toHex,
    prop: "color",
  },
  selectors: [exampleFinding.selector],
  markers: [
    { n: 1, severity: "serious", label: exampleFinding.title, left: 8, top: 46, width: 14, height: 7 },
  ],
};

/* — How it works — */
export function HowItWorks() {
  return (
    <section id="how" className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14">
        <div className="border-b border-ink pb-3">
          <SectionKicker>How it works</SectionKicker>
          <h2 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink">
            Three steps, no configuration
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
          {steps.map((s, i) => (
            <div key={s.n} className={i > 0 ? "md:border-l md:border-hairline md:pl-8" : "md:pr-8"}>
              <span
                className="font-cond text-[30px] leading-none font-semibold tabular-nums"
                style={{ color: s.tone === "verified" ? "var(--color-verified)" : "var(--color-serious)" }}
              >
                {s.n}
              </span>
              <h3 className="mt-2 text-[17px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-normal text-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* — Checks included: axe rules vs complementary passes — */
export function ChecksIncluded() {
  return (
    <section id="checks" className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14">
        <div className="border-b border-ink pb-3">
          <SectionKicker>Checks included</SectionKicker>
          <h2 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink">
            What&apos;s an automated rule and what&apos;s a complementary pass
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <SectionKicker tone="steel">axe-core rules · A and AA</SectionKicker>
            <p className="mt-1 text-[13px] text-muted">Pass or fail objectively</p>
            <ul className="mt-4">
              {axeRules.map((r) => (
                <li
                  key={r.sc}
                  className="grid grid-cols-[76px_1fr] gap-3 border-t border-hairline py-2.5 text-[14px]"
                >
                  <span className="font-mono text-[13px] text-steel">{r.sc}</span>
                  <span className="text-body">{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionKicker tone="steel">Complementary passes</SectionKicker>
            <p className="mt-1 text-[13px] text-muted">What axe does not do on its own</p>
            <ul className="mt-4">
              {complementaryPasses.map((p) => (
                <li
                  key={p.label}
                  className="grid grid-cols-[76px_1fr] gap-3 border-t border-hairline py-2.5 text-[14px]"
                >
                  <span className="font-cond text-[11px] tracking-[0.1em] text-muted uppercase">
                    {p.label}
                  </span>
                  <span className="text-body">{p.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* — Evidence Lens — */
export function EvidenceLensSection() {
  return (
    <section id="evidence" className="border-y border-border bg-band">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_620px]">
        <div>
          <h2 className="text-[32px] leading-[1.12] font-semibold tracking-[-0.02em] text-ink">
            The difference between a list of errors and a barrier you can see
          </h2>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.55] text-body">
            Each finding carries the element&apos;s position on the capture. Select the violation
            and its marker lights up; click the marker and the diagnosis opens. The active
            occurrence is filled and labelled, its siblings stay in a dashed outline — the
            distinction never depends on color.
          </p>
          <dl className="mt-6 space-y-2 text-[14px]">
            <div className="flex items-center gap-3">
              <span className="font-cond text-[15px] font-semibold text-serious">2.1:1</span>
              <span className="text-muted">the measure found, not an adjective</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[13px] text-steel">a.hero__cta</span>
              <span className="text-muted">the exact selector, with the HTML snippet</span>
            </div>
            <div className="flex items-center gap-3">
              <SectionKicker tone="steel" className="!text-verified">
                Sandbox
              </SectionKicker>
              <span className="text-muted">re-audited in a copy, without touching the site</span>
            </div>
          </dl>
        </div>

        <BrowserFrame
          label="Captured page · 1200 × 800 · scale 43%"
          trailing={
            <div className="hidden items-stretch border border-border text-[12px] sm:flex">
              <span className="bg-ink px-2.5 py-1 font-medium text-surface">Normal</span>
              <span className="border-l border-border px-2.5 py-1 text-muted">Deuteranopia</span>
              <span className="border-l border-border px-2.5 py-1 text-muted">Grayscale</span>
            </div>
          }
        >
          <div className="relative h-[240px] overflow-hidden border-b border-ink" style={{ background: "#FBFAF7" }}>
            {/* illustrative page */}
            <div className="p-5">
              <div className="h-2.5 w-24 bg-ink/70" />
              <div className="mt-6 h-4 w-40 bg-ink/80" />
              <div className="mt-2 h-4 w-52 bg-ink/80" />
              <div className="mt-4 h-2 w-64 bg-ink/20" />
              <div className="mt-1.5 h-2 w-56 bg-ink/20" />
            </div>
            {/* highlight box + selected marker */}
            <span
              aria-hidden
              className="absolute"
              style={{ left: "6%", top: "44%", width: "16%", height: "9%", border: "2px solid var(--color-ink)", background: "rgba(168,90,6,.16)" }}
            />
            <span className="absolute" style={{ left: "22%", top: "44%", transform: "translate(-50%,-50%)" }}>
              <Marker n={1} state="selected" label="2.1:1 · needs 4.5:1" ariaLabel="Occurrence 1" />
            </span>
            <span className="absolute" style={{ left: "84%", top: "12%", transform: "translate(-50%,-50%)" }}>
              <Marker n={2} state="idle" dimmed ariaLabel="Occurrence 2" />
            </span>
          </div>
          <div className="p-4">
            <FindingRow finding={demoFinding} selected />
            <FindingDetail finding={demoFinding} host="aurora-coffee.com" />
          </div>
        </BrowserFrame>
      </div>
    </section>
  );
}

/* — Sandbox — */
export function SandboxSection() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.02em] text-ink">
            The fix is proved on a copy of the page — your site is never touched
          </h2>
          <p className="mt-4 max-w-[48ch] text-[16px] leading-[1.55] text-body">
            The change is applied to the copy&apos;s DOM, the rule runs again, and the change is
            reverted. If the rule stops flagging the element, the suggestion is labelled verified.
            If not, it arrives as needs review — never as a certainty.
          </p>
          <div className="mt-6 space-y-3">
            <div className="border border-verified/40 bg-surface p-3">
              <StatusSeal status="verified">Verified — the rule no longer flags the element in the copy</StatusSeal>
            </div>
            <div className="border border-dashed border-moderate bg-surface p-3">
              <StatusSeal status="needs-review">Needs review — the suggestion alone doesn&apos;t resolve it, or it changes page structure</StatusSeal>
            </div>
          </div>
        </div>

        <div className="border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <SectionKicker>Contrast measurement · 1.4.3 AA</SectionKicker>
            <span className="font-mono text-[12px] text-steel">a.hero__cta</span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-cond text-[46px] leading-none tabular-nums text-serious">2.1:1</span>
            <span className="pb-2 text-[13px] text-muted">
              found · minimum for normal text is {exampleFinding.required}:1
            </span>
          </div>
          <div className="mt-3">
            <Ruler variant="ratio" found={exampleFinding.measured} required={exampleFinding.required} fixed={exampleFinding.fixed} height={22} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div>
              <SectionKicker>Before</SectionKicker>
              <div className="mt-2 flex h-10 items-center justify-center" style={{ background: exampleFinding.fromHex, color: "#fff" }}>
                Order now
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
                <ColorSwatch hex={exampleFinding.fromHex} size={12} /> {exampleFinding.fromHex.toUpperCase()}
              </p>
            </div>
            <div>
              <SectionKicker tone="steel" className="!text-verified">After · verified</SectionKicker>
              <div className="mt-2 flex h-10 items-center justify-center" style={{ background: exampleFinding.toHex, color: "#fff" }}>
                Order now
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
                <ColorSwatch hex={exampleFinding.toHex} size={12} /> {exampleFinding.toHex.toUpperCase()}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-muted">
            The nearest passing color to the original, found by binary search on lightness — never
            pure black. Position on the ruler: {Math.round(ratioPosition(exampleFinding.fixed))}%.
          </p>
        </div>
      </div>
    </section>
  );
}

/* — Export — */
export function ExportSection() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14">
        <div className="border-b border-ink pb-3">
          <SectionKicker>Export</SectionKicker>
          <h2 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.015em] text-ink">
            Leaves the product in the format of whoever receives it
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr_340px]">
          <div>
            <h3 className="text-[16px] font-semibold text-ink">PDF for whoever decides</h3>
            <p className="mt-1.5 text-[14px] leading-normal text-body">
              Summary, ruler, severities and the findings with human impact in plain language — to
              send to a client or a product team.
            </p>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Markdown for whoever fixes</h3>
            <p className="mt-1.5 text-[14px] leading-normal text-body">
              Severity table, prioritized list, selector, snippet and verification status — ready to
              paste into an issue or a PR.
            </p>
          </div>
          <CodeBlock
            lines={exampleMarkdown.split("\n").map((text) => ({
              text,
              tone: text.startsWith("###") ? "muted" : text.includes("verified") ? "added" : "default",
            }))}
          />
        </div>
      </div>
    </section>
  );
}

/* — Final CTA (ink block) + footer — */
export function FinalCta() {
  return (
    <section className="bg-ink text-surface">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-center">
        <div>
          <h2 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.02em]">
            Measure a page now and see where the barrier is
          </h2>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-normal text-band">
            No account, no extension, no change to the site. The report is ready in under half a
            minute and leaves as PDF or Markdown.
          </p>
        </div>
        <div>
          <UrlForm accent />
          <p className="mt-3 text-[13px] text-disabled">
            We audit public pages only. Internal and private addresses are refused.
          </p>
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
