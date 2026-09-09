import type { FindingView } from "@/lib/report/findings";
import type { ContrastMeasurement } from "@/lib/report/contrast";
import { buildVerdict } from "@/lib/report/verdict";
import { buildContrastPreview } from "@/lib/report/preview";
import { BrowserFrame, ColorSwatch, Marker, StatusSeal } from "@/components/ui";
import { exampleFinding } from "./content";
import type { Translate } from "@/lib/i18n/t";

const demoMeasurement: ContrastMeasurement = {
  measured: exampleFinding.measured,
  required: exampleFinding.required,
  fixed: exampleFinding.fixed,
  fromHex: exampleFinding.fromHex,
  toHex: exampleFinding.toHex,
  bgHex: "#ffffff",
  prop: "color",
};

const demoVerdict = buildVerdict({
  kind: "wcag",
  isWcag: true,
  elements: exampleFinding.elements,
  fixGroups: null,
  fixVerification: "verified",
  hasAutoFix: true,
  verifySkipped: false,
});

export function demoFinding(t: Translate): FindingView {
  return {
    id: "demo",
    n: 1,
    kind: "wcag",
    isWcag: true,
    severity: "serious",
    passLabel: null,
    title: t(exampleFinding.title),
    criterionSc: exampleFinding.sc,
    criterionName: t(exampleFinding.name),
    elements: exampleFinding.elements,
    ruleId: exampleFinding.ruleId,
    desc: t("home.example.desc"),
    impact: t("impact.contrast"),
    fixText: t("home.example.fixText", {
      hex: exampleFinding.toHex.toUpperCase(),
      ratio: exampleFinding.fixed,
    }),
    fixCode: `color: ${exampleFinding.toHex};`,
    fixGroups: null,
    guidance: null,
    measurement: demoMeasurement,
    preview: buildContrastPreview(demoMeasurement, "verified", exampleFinding.elements),
    verdict: demoVerdict,
    occurrences: [],
    affectedSelectors: [exampleFinding.selector],
    selectors: [exampleFinding.selector],
    markers: [
      {
        n: 1,
        severity: "serious",
        label: t(exampleFinding.title),
        left: 8,
        top: 46,
        width: 14,
        height: 7,
        captureId: "overview",
        evidence: "captured" as const,
      },
    ],
    located: true,
    contexts: [],
    noMarkerReason: "",
  };
}

export function CapturePreview({ height = 240, t }: { height?: number; t: Translate }) {
  return (
    <div
      className="relative overflow-hidden border-b border-ink"
      style={{ height, background: "#FBFAF7" }}
    >
      <div className="flex items-center justify-between px-5 pt-3.5">
        <span className="font-cond text-[13px] font-semibold tracking-[0.22em] text-ink">
          AURORA
        </span>
        <div className="flex items-center gap-3.5">
          <span className="hidden text-[10px] text-ink/70 sm:inline">Menu</span>
          <span className="hidden text-[10px] text-ink/70 sm:inline">Beans</span>
          <span className="relative inline-block">
            <span
              aria-hidden
              className="absolute -inset-1 border border-dashed"
              style={{ borderColor: "rgba(23,24,26,.45)" }}
            />
            <span
              className="relative block px-2 py-1 text-[9px] font-semibold text-white"
              style={{ background: "#8fb8a8" }}
            >
              Order now
            </span>
            <span className="absolute top-1/2 left-0 translate-x-[-135%] -translate-y-1/2">
              <Marker n={2} state="idle" dimmed size={24} ariaLabel={t("home.lens.sharedColor")} />
            </span>
          </span>
        </div>
      </div>

      <div className="px-5 pt-4">
        <h3 className="font-sans text-[21px] leading-[1.05] font-semibold tracking-[-0.02em] text-ink">
          Slow-roasted,
          <br />
          small batch, since 2011
        </h3>
        <p className="mt-2 max-w-[62%] text-[10px] leading-normal text-ink/70">
          {t("home.demo.roasted")}
        </p>
        <span className="relative mt-4 inline-block">
          <span
            aria-hidden
            className="absolute -inset-1 border-2"
            style={{ borderColor: "var(--color-ink)", background: "rgba(168,90,6,.10)" }}
          />
          <span
            className="relative block px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: "#8fb8a8" }}
          >
            Order now
          </span>
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
            <Marker
              n={1}
              state="selected"
              label="2.1:1 · needs 4.5:1"
              ariaLabel={t("home.lens.locatedElement")}
            />
          </span>
        </span>
      </div>
    </div>
  );
}

export function HeroEvidencePreview({ t }: { t: Translate }) {
  return (
    <BrowserFrame
      label={t("home.lens.frameLabel")}
      trailing={
        <div className="hidden items-stretch border border-border text-[11px] sm:flex">
          <span className="bg-ink px-2 py-0.5 font-medium text-surface">{t("vision.normal")}</span>
          <span className="border-l border-border px-2 py-0.5 text-muted">
            {t("vision.short.deut")}
          </span>
          <span className="border-l border-border px-2 py-0.5 text-muted">
            {t("vision.short.gray")}
          </span>
        </div>
      }
    >
      <CapturePreview t={t} height={210} />
      <div
        className="border-t border-ink p-3.5"
        style={{ borderLeft: "3px solid var(--color-serious)" }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-5.5 shrink-0 items-center justify-center bg-ink font-cond text-[13px] font-semibold text-surface"
          >
            1
          </span>
          <span className="font-cond text-[11px] tracking-widest text-serious uppercase">
            {t("severity.serious")}
          </span>
          <span className="ml-auto font-mono text-[12px] text-steel">1.4.3 AA</span>
        </div>
        <p className="mt-2 text-[14.5px] font-semibold text-ink">{t(exampleFinding.title)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="font-mono text-[11.5px] text-steel">a.hero__cta</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            measured <span className="font-cond text-serious">2.1:1</span> vs min{" "}
            <span className="font-cond text-ink">4.5:1</span>
          </span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>7 elements share this color</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-hairline pt-2.5 text-[12.5px]">
          <ColorSwatch hex={exampleFinding.fromHex} size={14} />
          <span className="font-mono text-[11.5px] text-muted line-through">
            {exampleFinding.fromHex.toUpperCase()}
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
          <ColorSwatch hex={exampleFinding.toHex} size={14} />
          <span className="font-mono text-[11.5px] text-ink">
            {exampleFinding.toHex.toUpperCase()}
          </span>
          <span className="font-cond text-verified">→ 4.62:1</span>
          <span className="ml-auto">
            <StatusSeal t={t} status="verified">
              {t("home.lens.locatedVerified")}
            </StatusSeal>
          </span>
        </div>
      </div>
    </BrowserFrame>
  );
}
