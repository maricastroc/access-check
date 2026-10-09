import type { MessageKey } from "@/lib/i18n/t";

export const QUICK_EXAMPLES = ["www.headphonesty.com", "www.buzzfeed.com", "noosfera.com.br"];

export const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/accesscheck/odhbdcnojfgjbkbfajidablhibhhckgf";

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
  { label: "home.pass.motion", desc: "home.pass.motionDesc" },
  { label: "home.pass.live", desc: "home.pass.liveDesc" },
  { label: "home.pass.review", desc: "home.pass.reviewDesc" },
];

export type Step = { n: string; title: MessageKey; body: MessageKey; tone: "ink" | "verified" };

export const steps: Step[] = [
  { n: "01", title: "home.step1.title", body: "home.step1.body", tone: "ink" },
  { n: "02", title: "home.step2.title", body: "home.step2.body", tone: "ink" },
  { n: "03", title: "home.step3.title", body: "home.step3.body", tone: "verified" },
];

export const exampleFinding = {
  measured: 2.1,
};
