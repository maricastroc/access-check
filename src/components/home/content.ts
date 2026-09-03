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
  { label: "Keyboard", desc: "Walks the page with Tab and maps focus order, traps and invisible focus" },
  { label: "Context", desc: "Re-audits in a mobile viewport and after opening menus and disclosures" },
  { label: "Vision", desc: "Simulates deuteranopia, protanopia, tritanopia, low vision and grayscale on the capture" },
  { label: "Motion", desc: "Checks that the page respects prefers-reduced-motion" },
  { label: "Live", desc: "Watches live regions and dynamic announcements" },
  { label: "Review", desc: "Lists what needs a human eye, with the steps to confirm it" },
];

export type Step = { n: string; title: string; body: string; tone: "serious" | "verified" };

export const steps: Step[] = [
  {
    n: "01",
    title: "The page is really opened",
    body: "Headless Chromium loads the URL, waits for content to settle and injects axe-core — it works on sites with strict CSP.",
    tone: "serious",
  },
  {
    n: "02",
    title: "Each finding gets a measure and an element",
    body: "Contrast ratio, selector, snippet and position on the capture. Identical findings are grouped: one fix, N elements.",
    tone: "serious",
  },
  {
    n: "03",
    title: "The fix is tested before it's suggested",
    body: "The change is applied to a copy of the page, the rule runs again, and the result is labelled: verified, or needs review.",
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

/** The demo score and its arithmetic (base 100 − serious − moderate). */
export const exampleScore = {
  score: 71,
  passed: 39,
  manualReview: 4,
  deductions: [
    { severity: "serious" as Severity, issues: 1, elements: 7, penalty: 25, deduction: 25 },
    { severity: "moderate" as Severity, issues: 2, elements: 2, penalty: 4, deduction: 4 },
  ],
};

export const exampleMarkdown = `## aurora-coffee.com — 71/100
| severity | findings | elements |
| serious  | 1 | 7 |
| moderate | 2 | 2 |
### Fix first
1. color-contrast · 1.4.3 · verified`;
