import type { Severity } from "@/lib/scan/types";

/**
 * Illustrative landing content. The example figures below are a fixed demo (the
 * "aurora-coffee.com" page shown in the design), not a live scan — in production
 * every number comes from the real ScanResult. The vocabulary is kept honest:
 * internal priority score, WCAG A/AA (AAA not evaluated), sandbox re-audit.
 */

export type AxeRule = { sc: string; label: string };

export const axeRules: AxeRule[] = [
  { sc: "1.4.3", label: "Text contrast against a computed background" },
  { sc: "1.1.1", label: "Text alternatives for images and icons" },
  { sc: "4.1.2", label: "Accessible name for fields, buttons and ARIA controls" },
  { sc: "1.3.1", label: "Heading order and structural relationships" },
  { sc: "2.4.4", label: "Ambiguous or unlabeled link purpose" },
  { sc: "2.5.8", label: "Minimum target size" },
  { sc: "3.1.1", label: "Declared page language" },
  { sc: "1.4.4", label: "Viewport that does not block zoom" },
];

export type Pass = { label: string; desc: string };

export const complementaryPasses: Pass[] = [
  { label: "Keyboard", desc: "Tabs through the page to check focus order, keyboard traps and focus you can't see" },
  { label: "Context", desc: "Checks the page again at mobile size and after opening menus and expandable sections" },
  { label: "Vision", desc: "Simulates color blindness (deuteranopia, protanopia, tritanopia), low vision and grayscale" },
  { label: "Motion", desc: "Checks that the page respects the visitor's reduced-motion setting" },
  { label: "Live", desc: "Watches for updates announced to screen readers (live regions)" },
  { label: "Review", desc: "Lists what a person still needs to check, with the steps to confirm it" },
];

export type Step = { n: string; title: string; body: string; tone: "serious" | "verified" };

export const steps: Step[] = [
  {
    n: "01",
    title: "Opened in a real browser",
    body: "We open the page in a real browser, let it finish loading, then run the axe-core accessibility tests on it. This works even on sites with strict security rules (CSP).",
    tone: "serious",
  },
  {
    n: "02",
    title: "Every finding is measured and tied to an element",
    body: "Contrast ratio, selector, code snippet and position on the screenshot. Repeated issues are grouped, so one fix can cover several elements at once.",
    tone: "serious",
  },
  {
    n: "03",
    title: "Each fix is tested before we suggest it",
    body: "We apply the change to a copy of the page, run the check again, then mark the result as verified or needs review.",
    tone: "verified",
  },
];

/** The fixed example finding used across the Evidence Lens and sandbox sections. */
export const exampleFinding = {
  severity: "serious" as Severity,
  sc: "1.4.3",
  name: "Contrast (Minimum)",
  title: "Text below the minimum contrast",
  selector: "a.hero__cta",
  elements: 7,
  ruleId: "color-contrast",
  measured: 2.1,
  required: 4.5,
  fixed: 4.62,
  fromHex: "#8fb8a8",
  toHex: "#2f6b57",
};

/**
 * The demo score, computed with the engine's real (non-linear) formula:
 * penalty = 5·min(7,5) + 2·(1+1) = 29 → score = round(100·e^(-29/45)) = 53.
 * `ifFixed` is the score the page would reach if that severity were fixed on its
 * own (serious → 91, moderate → 57), the same projection the live report shows.
 */
export const exampleScore = {
  score: 53,
  passed: 39,
  manualReview: 4,
  deductions: [
    { severity: "serious" as Severity, issues: 1, elements: 7, penalty: 25, deduction: 41, ifFixed: 91, gain: 38 },
    { severity: "moderate" as Severity, issues: 2, elements: 2, penalty: 4, deduction: 6, ifFixed: 57, gain: 4 },
  ],
};

/** Plain-language read of the demo result, the same one-liner the report shows. */
export const exampleSummary =
  "No critical blockers, but 1 serious finding still makes the page harder to use for people who rely on assistive technology.";

export const exampleMarkdown = `## aurora-coffee.com: 53/100
| severity | findings | elements |
| serious  | 1 | 7 |
| moderate | 2 | 2 |
### Fix first
1. color-contrast · 1.4.3 · verified`;
