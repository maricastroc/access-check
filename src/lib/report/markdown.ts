import type { ScanResult } from "@/lib/scan/types";
import { reviewGuidance } from "../scan/review";
import { buildFindings, type FindingView } from "./findings";
import { scoreBreakdown } from "./score";
import { buildWcagReading } from "./wcag";
import { severityLabel } from "./severity";

/**
 * Presentation-layer Markdown export, in the Régua vocabulary. The engine's own
 * serializer (src/lib/scan/markdown.ts) is left untouched; this one keeps the
 * internal-score / WCAG-reading / sandbox distinctions and never says
 * "compliant", "certified" or "100% accessible".
 */

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const STATUS_LINE: Record<FindingView["fixStatus"], string> = {
  verified: "✓ Verified in a sandbox copy — the rule stopped flagging the element.",
  "needs-review": "? Needs review — the suggestion alone doesn't clear it.",
  unchecked: "· Not re-audited (complementary pass).",
};

function findingBlock(f: FindingView, out: string[]) {
  out.push(`#### ${f.title}`);
  out.push("");
  if (f.isWcag && f.criterionSc) {
    out.push(`- **WCAG:** ${f.criterionSc}${f.criterionName ? ` ${f.criterionName}` : ""}`);
  } else if (f.kind === "best-practice") {
    out.push(`- **Best practice** (not a WCAG success criterion)`);
  }
  if (f.passLabel && f.kind !== "best-practice") out.push(`- **Pass:** ${f.passLabel}`);
  if (f.selectors.length > 0) out.push(`- **Selector:** \`${f.selectors[0]}\``);
  out.push(`- **Elements:** ${f.elements}${f.elements > 1 ? " (one fix resolves all)" : ""}`);
  if (f.measurement) {
    const m = f.measurement;
    out.push(
      `- **Measured:** ${m.measured.toFixed(2)}:1 · minimum AA ${m.required.toFixed(1)}:1` +
        (m.fixed != null ? ` · fix reaches ${m.fixed.toFixed(2)}:1` : ""),
    );
  }
  out.push("");
  if (f.desc) {
    out.push(f.desc);
    out.push("");
  }
  out.push("**Suggested fix:**");
  out.push("");
  out.push(f.measurement?.toHex ? `Set ${f.measurement.prop ?? "color"} to ${f.measurement.toHex.toUpperCase()}.` : f.fixText);
  if (f.fixCode) out.push("", "```", f.fixCode, "```");
  out.push("", `_${STATUS_LINE[f.fixStatus]}_`);
  out.push("");
}

export function buildReportMarkdown(result: ScanResult): string {
  const out: string[] = [];
  const breakdown = scoreBreakdown(result.violations, result.score);
  const wcag = buildWcagReading(result.violations);
  const findings = buildFindings(result);

  out.push(`# Accessibility report — ${result.title || host(result.finalUrl)}`);
  out.push("");
  out.push(`- **URL:** ${result.finalUrl}`);
  out.push(`- **Internal priority score:** ${result.score} / 100 _(priority, not a WCAG conformance grade)_`);
  out.push(`- **Elements scanned:** ${result.scannedElements}`);
  out.push(`- **Generated:** ${new Date().toISOString().slice(0, 10)}`);
  out.push("");
  out.push(`> ${result.summary}`);
  out.push("");

  out.push("## Score arithmetic");
  out.push("");
  out.push("| Item | Deduction |");
  out.push("| --- | --- |");
  out.push(`| Base | 100 |`);
  for (const d of breakdown.deductions) {
    out.push(`| ${d.issues} ${severityLabel[d.severity].toLowerCase()} · ${d.elements} elements | −${d.deduction} |`);
  }
  out.push(`| ${result.counts.manualReview} manual-review items | outside score |`);
  out.push(`| **Internal priority score** | **${result.score}** |`);
  out.push("");

  out.push("## WCAG reading");
  out.push("");
  out.push(
    `- **A:** ${wcag.a.fails ? `fails by ${wcag.a.criteria.map((c) => c.sc).join(", ")}` : "no automated level-A failures"}`,
  );
  out.push(
    `- **AA:** ${wcag.aa.fails ? `fails by ${wcag.aa.criteria.map((c) => (c.name ? `${c.sc} ${c.name}` : c.sc)).join(", ")}` : "no automated level-AA failures"}`,
  );
  out.push(`- **AAA:** not evaluated — the engine runs A and AA (WCAG 2.0/2.1/2.2)`);
  out.push("");

  out.push("## Findings");
  out.push("");
  if (findings.length === 0) {
    out.push("No automated failures on this page. This is coverage, not WCAG conformance.");
    out.push("");
  } else {
    for (const f of findings) findingBlock(f, out);
  }

  if (result.incomplete.length > 0) {
    out.push("## Needs manual review");
    out.push("");
    out.push("Automated testing couldn't decide these — confirm them by hand. Outside the score.");
    out.push("");
    for (const inc of result.incomplete) {
      out.push(`### ${inc.title}`);
      out.push("");
      out.push(`- **WCAG:** ${inc.criterion}`);
      if (inc.selectors.length > 0) {
        out.push(`- **Where:** ${inc.selectors.map((s) => `\`${s}\``).join(", ")}`);
      }
      out.push("");
      const guide = reviewGuidance(inc.id);
      out.push(`**How to check:** ${guide.how}`);
      out.push("");
      for (const step of guide.steps) out.push(`- ${step}`);
      out.push("");
    }
  }

  if (result.passed.length > 0) {
    out.push(`## Automated checks passed (${result.passed.length})`);
    out.push("");
    for (const p of result.passed) out.push(`- ${p}`);
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push(
    "_Fixes are applied and re-audited in a sandbox copy; the audited site is not altered. The score is an internal priority measure, not a declaration of conformance._",
  );
  out.push("");

  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

export function reportMarkdownFilename(result: ScanResult): string {
  const slug = host(result.finalUrl)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `accesscheck-${slug || "report"}.md`;
}
