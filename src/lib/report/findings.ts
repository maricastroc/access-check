import type { FixGroup, ScanMarker, ScanResult, ScanViolation, Severity } from "@/lib/scan/types";
import type { ContextIssue } from "@/lib/scan/contexts";
import type { KeyboardOccurrence } from "@/lib/scan/keyboard";
import { SEVERITY_ORDER } from "./severity";
import { parseContrastFix, type ContrastMeasurement } from "./contrast";
import { buildVerdict, type Verdict } from "./verdict";
import { buildContrastPreview, type ContrastPreview } from "./preview";
import {
  fixGuidance,
  humanImpact,
  isDocLevelCategory,
  markerReason,
  type Guidance,
} from "./guidance";

export type FindingKind =
  | "wcag"
  | "keyboard"
  | "target-size"
  | "reduced-motion"
  | "live-regions"
  | "context"
  | "best-practice";

const PASS_LABEL: Partial<Record<FindingKind, string>> = {
  keyboard: "Keyboard",
  "target-size": "Target size",
  "reduced-motion": "Reduced motion",
  "live-regions": "Live regions",
  context: "Responsive & dynamic",
  "best-practice": "Best practice",
};

export type FindingView = {
  id: string;
  n: number;
  kind: FindingKind;
  isWcag: boolean;
  severity: Severity | null;
  passLabel: string | null;
  title: string;
  criterionSc: string | null;
  criterionName: string | null;
  elements: number;
  ruleId: string;
  desc: string;
  impact: string;
  fixText: string;
  fixCode: string | null;
  fixGroups: FixGroup[] | null;
  guidance: Guidance | null;
  measurement: ContrastMeasurement | null;
  preview: ContrastPreview | null;
  verdict: Verdict;
  affectedSelectors: string[];
  selectors: string[];
  markers: ScanMarker[];
  located: boolean;
  noMarkerReason: string;
  contexts: string[];
  occurrences: KeyboardOccurrence[];
};

function distinct(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

function affectedFrom(v: ScanViolation): string[] {
  const fromGroups = (v.fixGroups ?? []).flatMap((g) => g.selectors);
  const all = distinct([...fromGroups, v.where].filter((s) => s && s !== "—"));
  return all;
}

function wcagFinding(
  v: ScanViolation,
  markers: ScanMarker[],
  verifySkipped: boolean,
): Omit<FindingView, "n"> {
  const { sc, name } = splitCriterion(v.criterion);
  const measurement = parseContrastFix(v.fix, v.fixCode);
  const fixGroups = v.fixGroups && v.fixGroups.length > 0 ? v.fixGroups : null;
  const hasAutoFix = Boolean(v.fixCode);
  const verdict = buildVerdict({
    kind: "wcag",
    isWcag: true,
    elements: v.nodes,
    fixGroups,
    fixVerification: v.verification,
    hasAutoFix,
    verifySkipped,
  });
  const linked = linkMarkers(v, markers);
  const affected = affectedFrom(v);
  return {
    id: `wcag:${v.id}`,
    kind: "wcag",
    isWcag: true,
    severity: v.severity,
    passLabel: null,
    title: v.title,
    criterionSc: sc,
    criterionName: name,
    elements: v.nodes,
    ruleId: v.id,
    desc: v.desc,
    impact: humanImpact(v.id),
    fixText: v.fix,
    fixCode: v.fixCode ?? null,
    fixGroups,
    guidance: v.fixCode || measurement ? null : fixGuidance(v.id),
    measurement,
    preview: buildContrastPreview(measurement, v.verification, v.nodes),
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: linked,
    located: linked.length > 0,
    contexts: v.contexts ?? [],
    occurrences: [],
    noMarkerReason: linked.length > 0 ? "" : markerReason(v.id, "wcag", isDocLevelCategory(v.id)),
  };
}

type PassFinding = {
  id: string;
  severity: Severity;
  criterion: string;
  title: string;
  desc: string;
  fix: string;
  count: number;
  selectors: string[];
  occurrences?: KeyboardOccurrence[];
};

function complementaryFinding(f: PassFinding, kind: FindingKind): Omit<FindingView, "n"> {
  const { sc, name } = splitCriterion(f.criterion);
  const verdict = buildVerdict({
    kind,
    isWcag: true,
    elements: f.count,
    fixGroups: null,
    hasAutoFix: false,
    verifySkipped: false,
  });
  const affected = distinct(f.selectors);
  return {
    id: `${kind}:${f.id}`,
    kind,
    isWcag: true,
    severity: f.severity,
    passLabel: PASS_LABEL[kind] ?? null,
    title: f.title,
    criterionSc: sc,
    criterionName: name,
    elements: f.count,
    ruleId: f.id,
    desc: f.desc,
    impact: humanImpact(f.id, kind),
    fixText: f.fix,
    fixCode: null,
    fixGroups: null,
    guidance: fixGuidance(f.id, kind),
    measurement: null,
    preview: null,
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: [],
    located: false,
    contexts: [],
    occurrences: f.occurrences ?? [],
    noMarkerReason: markerReason(f.id, kind, false),
  };
}

function contextFinding(issue: ContextIssue, where: string): Omit<FindingView, "n"> {
  const { sc, name } = splitCriterion(issue.criterion);
  const verdict = buildVerdict({
    kind: "context",
    isWcag: true,
    elements: issue.nodes,
    fixGroups: null,
    hasAutoFix: false,
    verifySkipped: false,
  });
  const affected = distinct(issue.selectors);
  return {
    id: `context:${where}:${issue.id}`,
    kind: "context",
    isWcag: true,
    severity: issue.severity,
    passLabel: PASS_LABEL.context ?? "Responsive & dynamic",
    title: issue.title,
    criterionSc: sc,
    criterionName: name,
    elements: issue.nodes,
    ruleId: issue.id,
    desc: `Found only in this context (${where}). It does not fail on the first desktop load.`,
    impact: humanImpact(issue.id, "context"),
    fixText:
      "Re-check this element in the affected context; the engine did not sandbox a fix here.",
    fixCode: null,
    fixGroups: null,
    guidance: fixGuidance(issue.id, "context"),
    measurement: null,
    preview: null,
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: [],
    located: false,
    contexts: [where],
    occurrences: [],
    noMarkerReason: markerReason(issue.id, "context", false),
  };
}

function bestPracticeFindings(result: ScanResult): Omit<FindingView, "n">[] {
  return result.bestPractice.map((bp) => {
    const affected = distinct(bp.selectors);
    return {
      id: `best-practice:${bp.id}`,
      kind: "best-practice" as const,
      isWcag: false,
      severity: null,
      passLabel: PASS_LABEL["best-practice"] ?? "Best practice",
      title: bp.title,
      criterionSc: null,
      criterionName: null,
      elements: bp.nodes,
      ruleId: bp.id,
      desc: bp.desc,
      impact: humanImpact(bp.id, "best-practice"),
      fixText: bp.desc,
      fixCode: null,
      fixGroups: null,
      guidance: fixGuidance(bp.id, "best-practice"),
      measurement: null,
      preview: null,
      verdict: buildVerdict({
        kind: "best-practice",
        isWcag: false,
        elements: bp.nodes,
        fixGroups: null,
        hasAutoFix: false,
        verifySkipped: false,
      }),
      affectedSelectors: affected,
      selectors: affected,
      markers: [],
      located: false,
      contexts: [],
      occurrences: [],
      noMarkerReason: markerReason(bp.id, "best-practice", false),
    };
  });
}

function linkMarkers(v: ScanViolation, markers: ScanMarker[]): ScanMarker[] {
  return markers.filter((m) => m.severity === v.severity && m.label === v.title);
}

function splitCriterion(criterion: string): { sc: string | null; name: string | null } {
  const m = criterion.match(/(\d+\.\d+\.\d+)/);
  const sc = m ? m[1] : null;
  const name = criterion.split(" · ")[1]?.trim() ?? null;
  return { sc, name };
}

export function buildFindings(result: ScanResult): FindingView[] {
  const verifySkipped = (result.warnings ?? []).some((w) => w.code === "verification-skipped");
  const withSeverity: Omit<FindingView, "n">[] = [];

  const listed = new Map<string, Omit<FindingView, "n">>();
  const add = (finding: Omit<FindingView, "n">, context?: string) => {
    const seen = listed.get(finding.ruleId);
    if (seen) {
      if (context && !seen.contexts.includes(context)) seen.contexts.push(context);
      return;
    }
    listed.set(finding.ruleId, finding);
    withSeverity.push(finding);
  };

  for (const v of result.violations) add(wcagFinding(v, result.markers, verifySkipped));

  for (const f of result.keyboard?.findings ?? []) add(complementaryFinding(f, "keyboard"));

  for (const f of result.audits?.targetSize?.findings ?? [])
    add(complementaryFinding(f, "target-size"));
  for (const f of result.audits?.reducedMotion?.findings ?? [])
    add(complementaryFinding(f, "reduced-motion"));
  for (const f of result.audits?.liveRegions?.findings ?? [])
    add(complementaryFinding(f, "live-regions"));

  const ctx = result.contexts;
  if (ctx) {
    const mobile = `${ctx.mobile.width}px viewport`;
    for (const issue of ctx.mobile.onlyOnMobile) add(contextFinding(issue, mobile), mobile);
    for (const state of ctx.dynamic.states)
      for (const issue of state.newIssues) add(contextFinding(issue, state.label), state.label);
  }

  withSeverity.sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(a.severity as Severity);
    const sb = SEVERITY_ORDER.indexOf(b.severity as Severity);
    if (sa !== sb) return sa - sb;
    return b.elements - a.elements;
  });

  const bestPractice = bestPracticeFindings(result).filter((f) => !listed.has(f.ruleId));

  const ordered = [...withSeverity, ...bestPractice];
  return ordered.map((f, i) => ({ ...f, n: i + 1 }));
}

export function orderedMarkers(result: ScanResult): ScanMarker[] {
  return [...result.markers].sort((a, b) => a.n - b.n);
}
