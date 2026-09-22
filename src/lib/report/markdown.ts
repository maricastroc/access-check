import type { ScanResult } from "@/lib/scan/types";
import { reviewGuidance } from "../scan/review";
import { buildFindings, type FindingView } from "./findings";
import { describeElement, identityLabel } from "./identity";
import { violationsBehindScore } from "../scan/scored";
import { scoreBreakdown } from "./score";
import { wcagReadingOf } from "./wcag";
import { severityLabel } from "./severity";
import { standingOf, STANDING_LABEL, STANDING_NOTE, scoringIsCurrent } from "./standing";
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
      .map((s) => `\`${describeElement(s, f.identities[s], t).label}\``)
      .join(", ");
    const extra = f.affectedSelectors.length - 5;
    out.push(
      `- **${t("md.affected")}:** ${shown}${extra > 0 ? ` ${t("md.andMore", { count: extra })}` : ""}`,
    );
    const first = describeElement(f.affectedSelectors[0], f.identities[f.affectedSelectors[0]], t);
    if (first.context) out.push(`- **${t("md.whereLabel")}:** ${first.context}`);
    if (first.label !== first.locator) {
      out.push(`- **${t("detail.technicalSelector")}:** \`${first.locator}\``);
    }
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
  const label = verdictLabel(f.verdict, t);
  const note = verdictMessage(f.verdict, t, f.measurement);
  out.push("", label ? `**${label}.** _${note}_` : `_${note}_`);
  out.push("");
}

export function buildReportMarkdown(result: ScanResult): string {
  const t = translator(result.locale);
  const out: string[] = [];
  const breakdown = scoreBreakdown(violationsBehindScore(result), result.score);
  const wcag = wcagReadingOf(result);
  const findings = buildFindings(result);
  const standing = standingOf(result.counts);

  out.push(`# ${t("md.reportTitle", { name: result.title || host(result.finalUrl) })}`);
  out.push("");
  out.push(`- **${t("md.url")}:** ${result.finalUrl}`);
  out.push(
    `- **${t("standing.kicker")}:** ${t(STANDING_LABEL[standing])} — ${t(STANDING_NOTE[standing])}`,
  );
  out.push(`- **${t("md.elementsScanned")}:** ${result.scannedElements}`);
  out.push(`- **${t("md.generated")}:** ${new Date().toISOString().slice(0, 10)}`);
  out.push("");
  out.push(`> ${result.summary}`);
  out.push("");

  out.push(`## ${t("priority.kicker")}`);
  out.push("");
  out.push(t("priority.note"));
  out.push("");
  if (breakdown.deductions.length > 0) {
    out.push(`| ${t("md.colIfYouFix")} | ${t("md.colElements")} | ${t("md.colShare")} |`);
    out.push("| --- | --- | --- |");
    for (const d of breakdown.deductions) {
      out.push(
        `| ${d.issues} ${severityLabel(d.severity, t).toLowerCase()} | ${d.elements} | ${t("priority.share", { share: d.share })} |`,
      );
    }
    out.push("");
  } else {
    out.push(t("priority.nothing"));
    out.push("");
  }
  out.push(t("md.manualOutside", { count: result.counts.manualReview }));
  out.push("");
  if (!scoringIsCurrent(result)) {
    out.push(`> ${t("standing.staleTitle")}. ${t("standing.staleBody")}`);
    out.push("");
  }

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

  const failures = findings.filter((f) => f.evidence !== "heuristic");
  const observations = findings.filter((f) => f.evidence === "heuristic");

  out.push(`## ${t("md.findings")}`);
  out.push("");
  if (failures.length === 0) {
    out.push(t("md.noFailures"));
    out.push("");
  } else {
    for (const f of failures) findingBlock(f, out, t);
  }

  if (observations.length > 0) {
    out.push(`## ${t("md.needsHumanCheck")}`);
    out.push("");
    out.push(t("md.needsHumanCheckNote"));
    out.push("");
    for (const f of observations) findingBlock(f, out, t);
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
        const named = inc.selectors.map((s) => {
          const identity = result.identities?.[s];
          return `\`${identity ? identityLabel(identity, t) : s}\``;
        });
        out.push(`- **${t("md.whereLabel")}:** ${named.join(", ")}`);
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
