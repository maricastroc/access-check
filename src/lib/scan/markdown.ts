import type { FixGroup, FixVerification, ScanResult } from "./types";
import { severityOrder } from "./derive";
import { reviewGuidance } from "./review";
import { translator, type MessageKey, type Translate } from "../i18n/t";

const SEVERITY_KEY: Record<string, MessageKey> = {
  critical: "severity.critical",
  serious: "severity.serious",
  moderate: "severity.moderate",
  minor: "severity.minor",
};

const VERIFICATION_KEY: Partial<Record<FixVerification, MessageKey>> = {
  verified: "md.verifiedTag",
  failed: "md.needsReviewTag",
};

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function fixGroupLines(g: FixGroup, t: Translate): string[] {
  const lines: string[] = [];
  lines.push(g.text);
  if (g.code) lines.push("", "```", g.code, "```");
  const meta: string[] = [];
  if (g.count > 1) meta.push(t("md.resolvesElements", { count: g.count }));
  const tag = VERIFICATION_KEY[g.verification];
  if (tag) meta.push(t(tag));
  if (meta.length) lines.push("", `_${meta.join(" · ")}_`);
  return lines;
}

export function buildMarkdown(result: ScanResult): string {
  const t = translator(result.locale);
  const { counts } = result;
  const out: string[] = [];

  out.push(`# ${t("md.reportTitleDash", { name: result.title || host(result.finalUrl) })}`);
  out.push("");
  out.push(`- **${t("md.url")}:** ${result.finalUrl}`);
  out.push(`- **${t("md.scoreLabel")}:** ${result.score} / 100`);
  out.push(`- **${t("md.elementsScanned")}:** ${result.scannedElements}`);
  out.push(`- **${t("md.generated")}:** ${new Date().toISOString().slice(0, 10)}`);
  out.push("");
  out.push(`> ${result.summary}`);
  out.push("");

  out.push(`## ${t("md.summary")}`);
  out.push("");
  out.push(
    `| ${t("md.colCritical")} | ${t("md.colSerious")} | ${t("md.colModerate")} | ${t("md.colMinor")} | ${t("md.colPassed")} |`,
  );
  out.push("| --- | --- | --- | --- | --- |");
  out.push(
    `| ${counts.critical} | ${counts.serious} | ${counts.moderate} | ${counts.minor} | ${counts.passed} |`,
  );
  out.push("");

  if (result.fixFirst.length > 0) {
    out.push(`## ${t("md.fixFirst")}`);
    out.push("");
    for (const f of result.fixFirst) {
      out.push(
        `${Number(f.n)}. ` +
          t("md.fixFirstLine", { title: f.title, impact: f.impact, effort: f.effort }),
      );
    }
    out.push("");
  }

  out.push(`## ${t("md.violations")}`);
  out.push("");
  if (result.violations.length === 0) {
    out.push(t("md.noViolations"));
    out.push("");
  } else {
    for (const sev of severityOrder) {
      const items = result.violations.filter((v) => v.severity === sev);
      if (items.length === 0) continue;
      out.push(
        `### ` + t("md.severityHeading", { severity: t(SEVERITY_KEY[sev]), count: items.length }),
      );
      out.push("");
      for (const v of items) {
        out.push(`#### ${v.title}`);
        out.push("");
        out.push(`- **WCAG:** ${v.criterion}`);
        out.push(`- **${t("md.selectorLabel")}:** \`${v.where}\``);
        out.push(`- **${t("md.occurrencesLabel")}:** ${v.nodes}`);
        out.push("");
        if (v.desc) {
          out.push(v.desc);
          out.push("");
        }
        out.push(`**${t("md.suggestedFix")}:**`);
        out.push("");
        if (v.fixGroups && v.fixGroups.length > 0) {
          for (const g of v.fixGroups) out.push(...fixGroupLines(g, t));
        } else {
          out.push(v.fix);
        }
        out.push("");
      }
    }
  }

  const kb = result.keyboard;
  if (kb) {
    out.push(`## ${t("md.keyboardHeading")}`);
    out.push("");
    out.push(
      t("md.tracedStops", { count: kb.totalStops }) +
        " · " +
        (kb.totalInteractive > 0
          ? t("md.reachableCounts", {
              reachable: kb.reachableInteractive,
              total: kb.totalInteractive,
            })
          : t("md.noInteractive")) +
        ".",
    );
    out.push("");
    if (kb.findings.length === 0) {
      out.push(t("md.noKeyboard"));
      out.push("");
    } else {
      for (const f of kb.findings) {
        out.push(`### ${f.title}`);
        out.push("");
        out.push(`- **${t("md.severityLabel")}:** ${t(SEVERITY_KEY[f.severity])}`);
        out.push(`- **WCAG:** ${f.criterion}`);
        if (f.selectors.length > 0) {
          const shown = f.selectors.map((s) => `\`${s}\``).join(", ");
          const extra = f.count - f.selectors.length;
          out.push(
            `- **${t("md.affected")}:** ${shown}${extra > 0 ? ` _${t("md.andMore", { count: extra })}_` : ""}`,
          );
        }
        out.push("");
        out.push(f.desc);
        out.push("");
        out.push(`**${t("md.fixLabel")}:** ${f.fix}`);
        out.push("");
      }
    }
  }

  const ctx = result.contexts;
  if (ctx && (ctx.mobile.ran || ctx.dynamic.ran)) {
    out.push(`## ${t("md.contextsHeading")}`);
    out.push("");
    const checked: string[] = [];
    if (ctx.mobile.ran) checked.push(t("md.viewportChecked", { width: ctx.mobile.width }));
    if (ctx.dynamic.ran) checked.push(t("md.openedStates", { count: ctx.dynamic.opened }));
    out.push(t("md.rescannedBeyond", { checked: checked.join(", ") }));
    out.push("");

    const issueLines = (issue: (typeof ctx.mobile.onlyOnMobile)[number]) => {
      out.push(`- **${issue.title}** — ${t(SEVERITY_KEY[issue.severity])} · ${issue.criterion}`);
      if (issue.selectors.length > 0) {
        const shown = issue.selectors.map((s) => `\`${s}\``).join(", ");
        const extra = issue.nodes - issue.selectors.length;
        out.push(
          `  - ${t("md.affected")}: ${shown}${extra > 0 ? ` ${t("md.andMore", { count: extra })}` : ""}`,
        );
      }
    };

    if (ctx.mobile.onlyOnMobile.length > 0) {
      out.push(`### ${t("md.onlyAtWidth", { width: ctx.mobile.width })}`);
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
      out.push(t("md.noContexts"));
      out.push("");
    }
  }

  if (result.incomplete.length > 0) {
    out.push(`## ${t("md.needsManualReview")}`);
    out.push("");
    out.push(t("md.manualNote"));
    out.push("");
    for (const inc of result.incomplete) {
      out.push(`### ${inc.title}`);
      out.push("");
      out.push(`- **WCAG:** ${inc.criterion}`);
      if (inc.selectors.length > 0) {
        out.push(`- **${t("md.whereLabel")}:** ${inc.selectors.map((s) => `\`${s}\``).join(", ")}`);
      }
      out.push("");
      const guide = reviewGuidance(inc.id, t);
      out.push(`**${t("md.howToCheck")}:** ${guide.how}`);
      out.push("");
      for (const step of guide.steps) out.push(`- ${step}`);
      out.push("");
    }
  }

  if (result.passed.length > 0) {
    out.push(`## ${t("md.passedChecks", { count: result.passed.length })}`);
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

export function markdownFilename(result: ScanResult): string {
  const slug = host(result.finalUrl)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `accesscheck-${slug || "report"}.md`;
}
