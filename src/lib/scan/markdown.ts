import type { FixGroup, FixVerification, ScanResult } from "./types";
import { severityOrder } from "./derive";
import { reviewGuidance } from "./review";

const severityLabel: Record<string, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

const verificationLabel: Record<FixVerification, string> = {
  verified: "✅ Verified — re-scan passes",
  failed: "⚠️ Needs review — re-scan still flags",
  unchecked: "",
};

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function fixGroupLines(g: FixGroup): string[] {
  const lines: string[] = [];
  lines.push(g.text);
  if (g.code) lines.push("", "```", g.code, "```");
  const meta: string[] = [];
  if (g.count > 1) meta.push(`Resolves ${g.count} elements`);
  if (verificationLabel[g.verification]) meta.push(verificationLabel[g.verification]);
  if (meta.length) lines.push("", `_${meta.join(" · ")}_`);
  return lines;
}

/** Gera um relatório do scan em Markdown, pronto pra baixar/colar. */
export function buildMarkdown(result: ScanResult): string {
  const { counts } = result;
  const out: string[] = [];

  out.push(`# Accessibility report — ${result.title || host(result.finalUrl)}`);
  out.push("");
  out.push(`- **URL:** ${result.finalUrl}`);
  out.push(`- **Score:** ${result.score} / 100`);
  out.push(`- **Elements scanned:** ${result.scannedElements}`);
  out.push(`- **Generated:** ${new Date().toISOString().slice(0, 10)}`);
  out.push("");
  out.push(`> ${result.summary}`);
  out.push("");

  out.push("## Summary");
  out.push("");
  out.push("| Critical | Serious | Moderate | Minor | Passed |");
  out.push("| --- | --- | --- | --- | --- |");
  out.push(
    `| ${counts.critical} | ${counts.serious} | ${counts.moderate} | ${counts.minor} | ${counts.passed} |`,
  );
  out.push("");

  if (result.fixFirst.length > 0) {
    out.push("## Fix First");
    out.push("");
    for (const f of result.fixFirst) {
      out.push(`${Number(f.n)}. **${f.title}** — impact ${f.impact}, effort ${f.effort}`);
    }
    out.push("");
  }

  out.push("## Violations");
  out.push("");
  if (result.violations.length === 0) {
    out.push("No automated violations detected. 🎉");
    out.push("");
  } else {
    for (const sev of severityOrder) {
      const items = result.violations.filter((v) => v.severity === sev);
      if (items.length === 0) continue;
      out.push(`### ${severityLabel[sev]} (${items.length})`);
      out.push("");
      for (const v of items) {
        out.push(`#### ${v.title}`);
        out.push("");
        out.push(`- **WCAG:** ${v.criterion}`);
        out.push(`- **Selector:** \`${v.where}\``);
        out.push(`- **Occurrences:** ${v.nodes}`);
        out.push("");
        if (v.desc) {
          out.push(v.desc);
          out.push("");
        }
        out.push("**Suggested fix:**");
        out.push("");
        if (v.fixGroups && v.fixGroups.length > 0) {
          for (const g of v.fixGroups) out.push(...fixGroupLines(g));
        } else {
          out.push(v.fix);
        }
        out.push("");
      }
    }
  }

  const kb = result.keyboard;
  if (kb) {
    out.push("## Keyboard & focus");
    out.push("");
    out.push(
      `Traced ${kb.totalStops} focus ${kb.totalStops === 1 ? "stop" : "stops"} · ` +
        (kb.totalInteractive > 0
          ? `${kb.reachableInteractive}/${kb.totalInteractive} interactive elements reachable by keyboard`
          : "no interactive controls detected") +
        ".",
    );
    out.push("");
    if (kb.findings.length === 0) {
      out.push("No keyboard or focus issues detected. 🎉");
      out.push("");
    } else {
      for (const f of kb.findings) {
        out.push(`### ${f.title}`);
        out.push("");
        out.push(`- **Severity:** ${severityLabel[f.severity]}`);
        out.push(`- **WCAG:** ${f.criterion}`);
        if (f.selectors.length > 0) {
          const shown = f.selectors.map((s) => `\`${s}\``).join(", ");
          const extra = f.count - f.selectors.length;
          out.push(`- **Affected:** ${shown}${extra > 0 ? ` _(+${extra} more)_` : ""}`);
        }
        out.push("");
        out.push(f.desc);
        out.push("");
        out.push(`**Fix:** ${f.fix}`);
        out.push("");
      }
    }
  }

  const ctx = result.contexts;
  if (ctx && (ctx.mobile.ran || ctx.dynamic.ran)) {
    out.push("## Responsive & dynamic");
    out.push("");
    const checked: string[] = [];
    if (ctx.mobile.ran) checked.push(`${ctx.mobile.width}px viewport`);
    if (ctx.dynamic.ran)
      checked.push(`${ctx.dynamic.opened} opened state${ctx.dynamic.opened === 1 ? "" : "s"}`);
    out.push(`Re-scanned beyond the initial desktop load — checked ${checked.join(", ")}.`);
    out.push("");

    const issueLines = (issue: (typeof ctx.mobile.onlyOnMobile)[number]) => {
      out.push(`- **${issue.title}** — ${severityLabel[issue.severity]} · ${issue.criterion}`);
      if (issue.selectors.length > 0) {
        const shown = issue.selectors.map((s) => `\`${s}\``).join(", ");
        const extra = issue.nodes - issue.selectors.length;
        out.push(`  - Affected: ${shown}${extra > 0 ? ` (+${extra} more)` : ""}`);
      }
    };

    if (ctx.mobile.onlyOnMobile.length > 0) {
      out.push(`### Only at ${ctx.mobile.width}px`);
      out.push("");
      for (const issue of ctx.mobile.onlyOnMobile) issueLines(issue);
      out.push("");
    }
    for (const state of ctx.dynamic.states) {
      out.push(`### ${state.label}`);
      out.push("");
      for (const issue of state.newIssues) issueLines(issue);
      out.push("");
    }
    if (ctx.mobile.onlyOnMobile.length === 0 && ctx.dynamic.states.length === 0) {
      out.push("No new violations surfaced in these contexts. 🎉");
      out.push("");
    }
  }

  if (result.incomplete.length > 0) {
    out.push("## Needs manual review");
    out.push("");
    out.push("Automated testing couldn't determine these — confirm them by hand.");
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
    out.push(`## Passed checks (${result.passed.length})`);
    out.push("");
    for (const p of result.passed) out.push(`- ${p}`);
    out.push("");
  }

  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

/** Nome de arquivo seguro derivado do host: "example.com" → "accesscheck-example-com.md". */
export function markdownFilename(result: ScanResult): string {
  const slug = host(result.finalUrl)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `accesscheck-${slug || "report"}.md`;
}
