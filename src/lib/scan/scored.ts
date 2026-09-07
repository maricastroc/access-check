import type { ContextIssue } from "./contexts";
import type { ScanResult, ScanViolation, Severity } from "./types";

type RuleFinding = {
  id: string;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  count: number;
  selectors: string[];
};

function asViolation(f: RuleFinding): ScanViolation {
  return {
    id: f.id,
    severity: f.severity,
    title: f.title,
    criterion: f.criterion,
    where: f.selectors[0] ?? "—",
    desc: f.desc,
    fix: f.fix,
    nodes: f.count,
  };
}

export function ownRuleViolations(
  result: Pick<ScanResult, "keyboard" | "audits">,
): ScanViolation[] {
  const audits = result.audits;
  const findings: RuleFinding[] = [
    ...(result.keyboard?.findings ?? []),
    ...(audits?.targetSize?.findings ?? []),
    ...(audits?.reducedMotion?.findings ?? []),
    ...(audits?.liveRegions?.findings ?? []),
  ];
  return findings.map(asViolation);
}

export const SCORING_VERSION = 2;

const LEGACY_SCORING_VERSION = 1;

export function scoringVersionOf(result: Pick<ScanResult, "scoringVersion">): number {
  return result.scoringVersion ?? LEGACY_SCORING_VERSION;
}

function contextViolations(result: Pick<ScanResult, "contexts">): ScanViolation[] {
  const ctx = result.contexts;
  if (!ctx) return [];

  const byRule = new Map<string, ScanViolation>();
  const add = (issue: ContextIssue, where: string) => {
    const seen = byRule.get(issue.id);
    if (seen) {
      if (!seen.contexts!.includes(where)) seen.contexts!.push(where);
      seen.nodes = Math.max(seen.nodes, issue.nodes);
      return;
    }
    byRule.set(issue.id, {
      id: issue.id,
      severity: issue.severity,
      title: issue.title,
      criterion: issue.criterion,
      where: issue.selectors[0] ?? "—",
      desc: `Found only in this context (${where}). It does not fail on the first desktop load.`,
      fix: "Re-check this element in the affected context.",
      nodes: issue.nodes,
      contexts: [where],
    });
  };

  for (const issue of ctx.mobile.onlyOnMobile) add(issue, `${ctx.mobile.width}px viewport`);
  for (const state of ctx.dynamic.states)
    for (const issue of state.newIssues) add(issue, state.label);

  return [...byRule.values()];
}

export function scoredViolations(
  result: Pick<ScanResult, "violations" | "keyboard" | "audits" | "contexts">,
): ScanViolation[] {

  const charged = new Set(result.violations.map((v) => v.id));
  const take = (violations: ScanViolation[]) =>
    violations.filter((v) => {
      if (charged.has(v.id)) return false;
      charged.add(v.id);
      return true;
    });

  return [
    ...result.violations,
    ...take(ownRuleViolations(result)),
    ...take(contextViolations(result)),
  ];
}

export function violationsBehindScore(
  result: Pick<ScanResult, "violations" | "keyboard" | "audits" | "contexts" | "scoringVersion">,
): ScanViolation[] {
  return scoringVersionOf(result) === SCORING_VERSION
    ? scoredViolations(result)
    : result.violations;
}
