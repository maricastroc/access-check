"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  EvidenceChain,
  FindingList,
  Locus,
  NodeGlyph,
  RatioGauge,
  StandingMark,
  Summary,
  Tag,
  TextSample,
  sevOf,
} from "@/components/investigation";
import { BrandMark } from "@/components/ui/brand-mark";
import { workQueue } from "@/lib/report/findings";
import { buildReportMarkdown } from "@/lib/report/markdown";
import { occurrencesOf, occurrenceTag } from "@/lib/report/occurrences";
import { STANDING_LABEL, STANDING_NOTE, standingOf } from "@/lib/report/standing";
import { SCORING_VERSION } from "@/lib/scan/scored";
import { fixContrast } from "@/lib/scan/remediate";
import type { ScanResult } from "@/lib/scan/types";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { ReportLocale } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";

export const DEMO_HOST = "aurora-coffee.com";
export const DEMO_SELECTOR = "a.hero__cta";
const LINK = "#8fb8a8";
const PAGE = "#fbfaf7";
const MEASURED = 2.1;
const ELEMENTS = 7;

const noop = () => {};

function demoResult(t: Translate, locale: ReportLocale): ScanResult {
  const fix = fixContrast(
    { fgColor: LINK, bgColor: PAGE, contrastRatio: MEASURED, expectedContrastRatio: 4.5 },
    t,
  );
  const text = fix?.text ?? "";
  const code = fix?.code;
  const identity = (ref: string, region: string) => ({
    tag: "a",
    ref,
    name: t("home.demo.order"),
    region,
    regionName: null,
    nth: null,
    of: null,
  });

  return {
    url: `https://${DEMO_HOST}/`,
    finalUrl: `https://${DEMO_HOST}/`,
    locale,
    title: "Aurora",
    scannedElements: 180,
    durationMs: 9000,
    scoringVersion: SCORING_VERSION,
    screenshot: null,
    score: 0,
    counts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      passed: 39,
      bestPractice: 2,
      manualReview: 0,
    },
    summary: "",
    violations: [
      {
        id: "color-contrast",
        severity: "serious",
        title: "color-contrast",
        criterion: `WCAG 1.4.3 · ${t("wcag.1.4.3")}`,
        where: DEMO_SELECTOR,
        desc: "",
        fix: text,
        fixCode: code,
        fixConfidence: "deterministic",
        nodes: ELEMENTS,
        evidence: "deterministic",
        verification: "verified",
        fixGroups: [
          {
            text,
            code,
            count: ELEMENTS,
            selectors: [DEMO_SELECTOR, "nav a.order"],
            confidence: "deterministic",
            verification: "verified",
          },
        ],
      },
    ],
    incomplete: [],
    bestPractice: [
      { id: "heading-order", title: "heading-order", desc: "", nodes: 1, selectors: ["h3"] },
      { id: "region", title: "region", desc: "", nodes: 2, selectors: ["footer > p"] },
    ],
    passed: [],
    markers: [],
    identities: {
      [DEMO_SELECTOR]: identity(".hero__cta", "<main>"),
      "nav a.order": identity(".order", "<nav>"),
    },
    fixFirst: [],
  };
}

function useDemo() {
  const t = useT();
  const locale = useLocale();
  return useMemo(() => {
    const result = demoResult(t, locale);
    const groups = workQueue(result);
    const finding = groups.find((g) => g.group === "fix")!.findings[0];
    return { t, result, groups, finding, reading: finding.measurement! };
  }, [t, locale]);
}

function Marked({
  tag,
  current = false,
  side,
  className,
  children,
}: {
  tag: string;
  current?: boolean;
  side: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const place: CSSProperties =
    side === "right"
      ? { left: "calc(100% + 11px)", top: "50%", transform: "translateY(-50%)" }
      : { right: "calc(100% + 9px)", top: "50%", transform: "translateY(-50%)" };
  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <Locus
        box={{ left: 0, top: 0, width: 100, height: 100 }}
        weight={current ? "current" : "sibling"}
      />
      <span className="absolute flex" style={place}>
        <Tag
          n={tag}
          sev="serious"
          size={current ? 20 : 17}
          onPage
          selected={current}
          quiet={!current}
        />
      </span>
    </span>
  );
}

function OrderLink({ size }: { size: "nav" | "hero" }) {
  const t = useT();
  return (
    <span
      className={cn(
        "block font-semibold",
        size === "hero" ? "border-[1.5px] px-4 py-2 text-[13px]" : "border px-2 py-1 text-[9px]",
      )}
      style={{ color: LINK, borderColor: LINK }}
    >
      {t("home.demo.order")}
    </span>
  );
}

const SHELF = [
  { name: "Guji, Ethiopia", price: "€14", tone: "#c4622d" },
  { name: "Huila, Colombia", price: "€13", tone: "#2f5b4c" },
  { name: "Casa blend", price: "€11", tone: "#d9c9a3" },
];

export function DemoCapture() {
  const t = useT();
  return (
    <div
      aria-hidden
      inert
      className="relative aspect-[3/2] overflow-hidden outline -outline-offset-1 outline-ink/20"
      style={{ background: PAGE }}
    >
      <div className="flex items-center justify-between px-5 pt-3.5">
        <span className="text-[13px] font-semibold tracking-[0.22em] text-ink">AURORA</span>
        <div className="flex items-center gap-3.5">
          <span className="hidden text-[10px] text-ink/70 sm:inline">{t("home.demo.navMenu")}</span>
          <span className="hidden text-[10px] text-ink/70 sm:inline">
            {t("home.demo.navBeans")}
          </span>
          <Marked tag={occurrenceTag(1, 1, ELEMENTS)} side="left" className="ml-9">
            <OrderLink size="nav" />
          </Marked>
        </div>
      </div>

      <div className="px-5 pt-5">
        <h3 className="text-[21px] leading-[1.05] font-semibold tracking-[-0.02em] text-ink">
          {t("home.demo.headline")}
          <br />
          {t("home.demo.headlineRest")}
        </h3>
        <p className="mt-2 max-w-[62%] text-[10px] leading-normal text-ink/70">
          {t("home.demo.roasted")}
        </p>
        <Marked tag={occurrenceTag(1, 0, ELEMENTS)} current side="right" className="mt-5">
          <OrderLink size="hero" />
        </Marked>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 px-5">
        {SHELF.map((bag) => (
          <div key={bag.name}>
            <div className="aspect-[4/3]" style={{ background: bag.tone }} />
            <p className="mt-1.5 text-[10px] font-semibold text-ink">{bag.name}</p>
            <p className="text-[9px] text-ink/60">{bag.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoScreenshot({ label, sticky = false }: { label: string; sticky?: boolean }) {
  return (
    <div className="bg-booth">
      <div className={cn(sticky && "lg:sticky lg:top-0")}>
        <p className="px-4 pt-3 pb-2.5 text-[12.5px] font-semibold text-ink-2">{label}</p>
        <div className="px-4 pb-4">
          <DemoCapture />
        </div>
      </div>
    </div>
  );
}

export function DemoQueue() {
  const { t, groups } = useDemo();
  return (
    <div aria-hidden inert>
      <FindingList
        groups={groups.filter((g) => g.group === "fix")}
        selectedId={null}
        onToggle={noop}
        renderOpen={() => null}
        empty=""
        t={t}
      />
    </div>
  );
}

export function DemoSummary() {
  const { t, result, groups } = useDemo();
  return (
    <>
      <div aria-hidden inert>
        <Summary
          standing={standingOf(result.counts)}
          groups={groups}
          passed={result.counts.passed}
          selectedId={null}
          onSelect={noop}
          heading="h2"
          headingId="demo-standing"
          host={DEMO_HOST}
          t={t}
        />
      </div>
      <p className="sr-only">{t("home.example.summary")}</p>
    </>
  );
}

export function DemoChain() {
  const { t, groups, finding } = useDemo();
  return (
    <div aria-hidden inert>
      <FindingList
        groups={groups.filter((g) => g.group === "fix")}
        selectedId={finding.id}
        onToggle={noop}
        compact
        empty=""
        t={t}
        renderOpen={(f) => (
          <EvidenceChain
            finding={f}
            occurrences={occurrencesOf(f)}
            index={0}
            onPick={noop}
            host={DEMO_HOST}
            compact
            t={t}
          />
        )}
      />
    </div>
  );
}

export function DemoFixTest() {
  const { t, reading } = useDemo();
  return (
    <div aria-hidden inert data-sev="serious">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-mono text-[30px] leading-none font-semibold tracking-[-0.02em] text-serious-text">
          {reading.measured.toFixed(2)}:1
        </span>
        <span className="text-[15px] text-ink-2">
          {reading.required}:1 {t("chain.needed")}
        </span>
      </p>
      <div className="mt-3 max-w-xl">
        <RatioGauge
          measured={reading.measured}
          required={reading.required}
          sev="serious"
          neededLabel={t("chain.needed")}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextSample
          fg={reading.fromHex ?? LINK}
          bg={reading.bgHex ?? PAGE}
          text={t("home.demo.order")}
          caption={t("chain.onThePage")}
          ratio={reading.measured}
          tone="measured"
        />
        <TextSample
          fg={reading.toHex ?? LINK}
          bg={reading.bgHex ?? PAGE}
          text={t("home.demo.order")}
          caption={t("chain.withChange")}
          ratio={reading.fixed ?? reading.measured}
          tone="tested"
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-4">
        <NodeGlyph kind="end" sev="serious" end="tested" />
        <span className="text-[13.5px] font-semibold text-ink-2">{t("chain.end.tested")}</span>
        <span className="font-mono text-[15px] font-semibold text-verified">
          {(reading.fixed ?? 0).toFixed(2)}:1
        </span>
        <span className="text-[14px] text-ink-2">
          {t("chain.passes", { required: reading.required })}
        </span>
      </div>
    </div>
  );
}

export function DemoLocateStage() {
  return (
    <div
      aria-hidden
      inert
      className="flex h-17.5 items-center overflow-hidden px-3 outline -outline-offset-1 outline-ink/20"
      style={{ background: PAGE }}
    >
      <Marked tag={occurrenceTag(1, 0, ELEMENTS)} current side="right">
        <OrderLink size="nav" />
      </Marked>
    </div>
  );
}

export function DemoTestStage() {
  const { t, reading } = useDemo();
  return (
    <div aria-hidden className="space-y-2">
      <div className="flex items-center gap-2">
        <NodeGlyph kind="change" sev="serious" />
        <span className="font-mono text-[12.5px] text-ink-2">color: {reading.toHex}</span>
      </div>
      <div className="flex items-center gap-2">
        <NodeGlyph kind="end" sev="serious" end="tested" />
        <span className="font-mono text-[13px] font-semibold text-verified">
          {(reading.fixed ?? 0).toFixed(2)}:1
        </span>
        <span className="text-[13px] text-ink-2">{t("chain.status.tested")}</span>
      </div>
    </div>
  );
}

export function MiniReport() {
  const { t, result, groups } = useDemo();
  const standing = standingOf(result.counts);
  const toFix = groups.find((g) => g.group === "fix")?.findings ?? [];
  return (
    <div aria-hidden inert className="border border-hairline bg-surface p-4">
      <div className="border-b border-hairline pb-2">
        <span className="flex items-center gap-1.5">
          <BrandMark size={13} />
          <span className="text-[10px] font-semibold text-ink">AccessCheck</span>
        </span>
        <span className="mt-1 block font-mono text-[8.5px] text-muted">{DEMO_HOST}</span>
      </div>
      <p className="mt-3 text-[9px] font-semibold text-muted">{t("standing.kicker")}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[16px] leading-tight font-bold tracking-[-0.01em] text-ink">
        <StandingMark standing={standing} size={11} />
        {t(STANDING_LABEL[standing])}
      </p>
      <p className="mt-1 text-[8.5px] leading-snug text-muted">{t(STANDING_NOTE[standing])}</p>
      <p className="mt-3 text-[9px] font-semibold text-steel">{t("report.fixFirst")}</p>
      <ul className="mt-1.5 space-y-1.5">
        {toFix.map((f) => (
          <li key={f.id} className="flex items-start gap-1.5">
            <Tag n={f.n} sev={sevOf(f)} size={15} />
            <span className="text-[9.5px] leading-snug font-semibold text-ink">{f.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DemoMarkdown() {
  const { t, result } = useDemo();
  const lines = buildReportMarkdown(result).split("\n");
  const start = lines.findIndex((line) => line.startsWith("#### "));
  const block = lines.slice(start);
  const shown = ["WCAG", t("detail.technicalSelector"), t("md.measuredLabel")];
  const fields = block.filter((line) => shown.some((label) => line.startsWith(`- **${label}:**`)));
  const code = block[block.findIndex((line) => line.startsWith("```")) + 1] ?? "";
  const verdict = block.find((line) => line.startsWith("**") && line.includes("._"))?.split("_")[0];

  return (
    <div
      aria-hidden
      className="bg-code px-3 py-2.5 font-mono text-[12px] leading-[1.7] wrap-anywhere"
    >
      <div className="font-semibold text-ink">{block[0]}</div>
      {fields.map((line) => (
        <div key={line} className="text-ink-2">
          {line}
        </div>
      ))}
      <div className="text-ink-2">{code}</div>
      {verdict && <div className="text-verified">{verdict.trim()}</div>}
    </div>
  );
}
