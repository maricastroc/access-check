import type { FixGroup, FixVerification, ScanResult } from "./types";
import { severityOrder } from "./derive";

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
