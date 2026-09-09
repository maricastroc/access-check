import type { ScanResult } from "@/lib/scan/types";
import { reviewGuidance } from "../scan/review";
import { buildFindings, type FindingView } from "./findings";
import { violationsBehindScore } from "../scan/scored";
import { scoreBreakdown } from "./score";
import { buildWcagReading } from "./wcag";
import { severityLabel } from "./severity";
import { verdictLabel, verdictMessage } from "./verdict";
import { translator, type Translate } from "../i18n/t";

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function findingBlock(f: FindingView, out: string[], t: Translate) {
  out.push(`#### ${f.title}`);
  out.push("");
  if (f.isWcag && f.criterionSc) {
    out.push(`- **WCAG:** ${f.criterionSc}${f.criterionName ? ` ${f.criterionName}` : ""}`);
  } else if (f.kind === "best-practice") {
    out.push(`- ${t("md.bestPracticeNote")}`);
  }
  if (f.passLabel && f.kind !== "best-practice") {
    out.push(`- **${t("md.passLabel")}:** ${f.passLabel}`);
  }
  if (f.affectedSelectors.length > 0) {
    const shown = f.affectedSelectors
      .slice(0, 5)
      .map((s) => `\`${s}\``)
      .join(", ");
    const extra = f.affectedSelectors.length - 5;
    out.push(
      `- **${t("md.affected")}:** ${shown}${extra > 0 ? ` ${t("md.andMore", { count: extra })}` : ""}`,
    );
  }
  out.push(`- **${t("md.elementsLabel")}:** ${f.elements}`);
  if (f.measurement) {
    const m = f.measurement;
    out.push(
      `- **${t("md.measuredLabel")}:** ${m.measured.toFixed(2)}:1 · ` +
        t("md.minimumAA", { required: m.required.toFixed(1) }) +
        (m.fixed != null ? ` · ${t("md.fixReaches", { ratio: m.fixed.toFixed(2) })}` : ""),
    );
  }
  out.push("");
  out.push(`**${t("md.impact")}:** ${f.impact}`);
  out.push("");
  out.push(`**${t("md.suggestedFix")}:**`);
  out.push("");
  out.push(
    f.measurement?.toHex
      ? t("md.setProp", {
          prop: f.measurement.prop ?? "color",
          hex: f.measurement.toHex.toUpperCase(),
        })
      : f.fixText,
  );
  if (f.fixCode) out.push("", "```", f.fixCode, "```");
  else if (f.guidance?.example)
    out.push("", "```" + f.guidance.example.lang, f.guidance.example.code, "```");
  out.push("", `_${verdictLabel(f.verdict, t)}: ${verdictMessage(f.verdict, t, f.measurement)}_`);
  out.push("");
}

export function buildReportMarkdown(result: ScanResult): string {
  const t = translator(result.locale);
  const out: string[] = [];
  const breakdown = scoreBreakdown(violationsBehindScore(result), result.score);
  const wcag = buildWcagReading(result.violations);
  const findings = buildFindings(result);

  out.push(`# ${t("md.reportTitle", { name: result.title || host(result.finalUrl) })}`);
  out.push("");
  out.push(`- **${t("md.url")}:** ${result.finalUrl}`);
  out.push(`- **${t("md.priorityScore")}:** ${result.score} / 100 _${t("md.priorityNote")}_`);
  out.push(`- **${t("md.elementsScanned")}:** ${result.scannedElements}`);
  out.push(`- **${t("md.generated")}:** ${new Date().toISOString().slice(0, 10)}`);
  out.push("");
  out.push(`> ${result.summary}`);
  out.push("");

  out.push(`## ${t("md.whereScoreCanGo")}`);
  out.push("");
  out.push(t("md.currentScore", { score: result.score }));
  out.push("");
  if (breakdown.deductions.length > 0) {
    out.push(`| ${t("md.colIfYouFix")} | ${t("md.colElements")} | ${t("md.colScoreRises")} |`);
    out.push("| --- | --- | --- |");
    for (const d of breakdown.deductions) {
      out.push(
        `| ${d.issues} ${severityLabel(d.severity, t).toLowerCase()} | ${d.elements} | ${d.ifFixed} (+${d.gain}) |`,
      );
    }
    out.push("");
  }
  out.push(
    t("md.manualOutside", { count: result.counts.manualReview }) +
      (breakdown.deductions.length > 1 ? t("md.nonLinear") : ""),
  );
  out.push("");

  out.push(`## ${t("md.wcagReading")}`);
  out.push("");
  out.push(
    `- **A:** ${
      wcag.a.fails
        ? t("md.failsBy", { criteria: wcag.a.criteria.map((c) => c.sc).join(", ") })
        : t("md.noAFailures")
    }`,
  );
  out.push(
    `- **AA:** ${
      wcag.aa.fails
        ? t("md.failsBy", {
            criteria: wcag.aa.criteria.map((c) => (c.name ? `${c.sc} ${c.name}` : c.sc)).join(", "),
          })
        : t("md.noAAFailures")
    }`,
  );
  out.push(`- **AAA:** ${t("md.aaaNote")}`);
  out.push("");

  out.push(`## ${t("md.findings")}`);
  out.push("");
  if (findings.length === 0) {
    out.push(t("md.noFailures"));
    out.push("");
  } else {
    for (const f of findings) findingBlock(f, out, t);
  }

  if (result.incomplete.length > 0) {
    out.push(`## ${t("md.needsManualReview")}`);
    out.push("");
    out.push(t("md.manualOutsideScore"));
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
    out.push(`## ${t("md.checksPassed", { count: result.passed.length })}`);
    out.push("");
    for (const p of result.passed) out.push(`- ${p}`);
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push(t("md.footer"));
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
