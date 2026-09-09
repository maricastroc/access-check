import type { Severity } from "@/lib/scan/types";
import type { MessageKey } from "@/lib/i18n/t";

export type AxeRule = { sc: string; label: MessageKey };

export const axeRules: AxeRule[] = [
  { sc: "1.4.3", label: "home.rule.contrast" },
  { sc: "1.1.1", label: "home.rule.alt" },
  { sc: "4.1.2", label: "home.rule.name" },
  { sc: "1.3.1", label: "home.rule.headings" },
  { sc: "2.4.4", label: "home.rule.linkPurpose" },
  { sc: "2.5.8", label: "home.rule.targetSize" },
  { sc: "3.1.1", label: "home.rule.lang" },
  { sc: "1.4.4", label: "home.rule.zoom" },
];

export type Pass = { label: MessageKey; desc: MessageKey };

export const complementaryPasses: Pass[] = [
  { label: "home.pass.keyboard", desc: "home.pass.keyboardDesc" },
  { label: "home.pass.context", desc: "home.pass.contextDesc" },
  { label: "home.pass.vision", desc: "home.pass.visionDesc" },
  { label: "home.pass.motion", desc: "home.pass.motionDesc" },
  { label: "home.pass.live", desc: "home.pass.liveDesc" },
  { label: "home.pass.review", desc: "home.pass.reviewDesc" },
];

export type Step = { n: string; title: MessageKey; body: MessageKey; tone: "serious" | "verified" };

export const steps: Step[] = [
  { n: "01", title: "home.step1.title", body: "home.step1.body", tone: "serious" },
  { n: "02", title: "home.step2.title", body: "home.step2.body", tone: "serious" },
  { n: "03", title: "home.step3.title", body: "home.step3.body", tone: "verified" },
];

export const exampleFinding = {
  severity: "serious" as Severity,
  sc: "1.4.3",
  name: "home.example.name" as MessageKey,
  title: "home.example.title" as MessageKey,
  selector: "a.hero__cta",
  elements: 7,
  ruleId: "color-contrast",
  measured: 2.1,
  required: 4.5,
  fixed: 4.62,
  fromHex: "#8fb8a8",
  toHex: "#2f6b57",
};

export const exampleScore = {
  score: 53,
  passed: 39,
  manualReview: 4,
  deductions: [
    {
      severity: "serious" as Severity,
      issues: 1,
      elements: 7,
      penalty: 25,
      deduction: 41,
      ifFixed: 91,
      gain: 38,
    },
    {
      severity: "moderate" as Severity,
      issues: 2,
      elements: 2,
      penalty: 4,
      deduction: 6,
      ifFixed: 57,
      gain: 4,
    },
  ],
};

export const exampleSummary: MessageKey = "home.example.summary";

export const exampleMarkdownKeys: MessageKey[] = [
  "home.md.line1",
  "home.md.line2",
  "home.md.line3",
  "home.md.line4",
  "home.md.line5",
  "home.md.line6",
];
