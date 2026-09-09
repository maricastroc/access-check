import type { FixGroup, ScanMarker, ScanResult, ScanViolation, Severity } from "@/lib/scan/types";
import type { ContextIssue } from "@/lib/scan/contexts";
import type { KeyboardOccurrence } from "@/lib/scan/keyboard";
import { SEVERITY_ORDER } from "./severity";
import { parseContrastFix, type ContrastMeasurement } from "./contrast";
import { buildVerdict, type Verdict } from "./verdict";
import { buildContrastPreview, type ContrastPreview } from "./preview";
import { translator, type MessageKey, type Translate } from "../i18n/t";
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

const PASS_LABEL_KEY: Partial<Record<FindingKind, MessageKey>> = {
  keyboard: "finding.kind.keyboard",
  "target-size": "finding.kind.targetSize",
  "reduced-motion": "finding.kind.reducedMotion",
  "live-regions": "finding.kind.liveRegions",
  context: "finding.kind.context",
  "best-practice": "finding.kind.bestPractice",
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
  t: Translate,
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
    impact: humanImpact(v.id, t),
    fixText: v.fix,
    fixCode: v.fixCode ?? null,
    fixGroups,
    guidance: v.fixCode || measurement ? null : fixGuidance(v.id, t),
    measurement,
    preview: buildContrastPreview(measurement, v.verification, v.nodes),
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: linked,
    located: linked.length > 0,
    contexts: v.contexts ?? [],
    occurrences: [],
    noMarkerReason:
      linked.length > 0 ? "" : markerReason(v.id, "wcag", isDocLevelCategory(v.id), t),
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

function complementaryFinding(
  f: PassFinding,
  kind: FindingKind,
  t: Translate,
): Omit<FindingView, "n"> {
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
    passLabel: PASS_LABEL_KEY[kind] ? t(PASS_LABEL_KEY[kind]) : null,
    title: f.title,
    criterionSc: sc,
    criterionName: name,
    elements: f.count,
    ruleId: f.id,
    desc: f.desc,
    impact: humanImpact(f.id, t, kind),
    fixText: f.fix,
    fixCode: null,
    fixGroups: null,
    guidance: fixGuidance(f.id, t, kind),
    measurement: null,
    preview: null,
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: [],
    located: false,
    contexts: [],
    occurrences: f.occurrences ?? [],
    noMarkerReason: markerReason(f.id, kind, false, t),
  };
}

function contextFinding(issue: ContextIssue, where: string, t: Translate): Omit<FindingView, "n"> {
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
    passLabel: t("finding.kind.context"),
    title: issue.title,
    criterionSc: sc,
    criterionName: name,
    elements: issue.nodes,
    ruleId: issue.id,
    desc: t("finding.contextOnly", { where }),
    impact: humanImpact(issue.id, t, "context"),
    fixText: t("context.recheckLong"),
    fixCode: null,
    fixGroups: null,
    guidance: fixGuidance(issue.id, t, "context"),
    measurement: null,
    preview: null,
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: [],
    located: false,
    contexts: [where],
    occurrences: [],
    noMarkerReason: markerReason(issue.id, "context", false, t),
  };
}

function bestPracticeFindings(result: ScanResult, t: Translate): Omit<FindingView, "n">[] {
  return result.bestPractice.map((bp) => {
    const affected = distinct(bp.selectors);
    return {
      id: `best-practice:${bp.id}`,
      kind: "best-practice" as const,
      isWcag: false,
      severity: null,
      passLabel: t("finding.kind.bestPractice"),
      title: bp.title,
      criterionSc: null,
      criterionName: null,
      elements: bp.nodes,
      ruleId: bp.id,
      desc: bp.desc,
      impact: humanImpact(bp.id, t, "best-practice"),
      fixText: bp.desc,
      fixCode: null,
      fixGroups: null,
      guidance: fixGuidance(bp.id, t, "best-practice"),
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
      noMarkerReason: markerReason(bp.id, "best-practice", false, t),
    };
  });
}

export function locatedMarkers(finding: { markers: ScanMarker[] } | null): number {
  return new Set((finding?.markers ?? []).map((m) => m.n)).size;
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
  const t = translator(result.locale);
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

  for (const v of result.violations) add(wcagFinding(v, result.markers, verifySkipped, t));

  for (const f of result.keyboard?.findings ?? []) add(complementaryFinding(f, "keyboard", t));

  for (const f of result.audits?.targetSize?.findings ?? [])
    add(complementaryFinding(f, "target-size", t));
  for (const f of result.audits?.reducedMotion?.findings ?? [])
    add(complementaryFinding(f, "reduced-motion", t));
  for (const f of result.audits?.liveRegions?.findings ?? [])
    add(complementaryFinding(f, "live-regions", t));

  const ctx = result.contexts;
  if (ctx) {
    const mobile = `${ctx.mobile.width}px viewport`;
    for (const issue of ctx.mobile.onlyOnMobile) add(contextFinding(issue, mobile, t), mobile);
    for (const state of ctx.dynamic.states)
      for (const issue of state.newIssues) add(contextFinding(issue, state.label, t), state.label);
  }

  withSeverity.sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(a.severity as Severity);
    const sb = SEVERITY_ORDER.indexOf(b.severity as Severity);
    if (sa !== sb) return sa - sb;
    return b.elements - a.elements;
  });

  const bestPractice = bestPracticeFindings(result, t).filter((f) => !listed.has(f.ruleId));

  const ordered = [...withSeverity, ...bestPractice];
  return ordered.map((f, i) => ({ ...f, n: i + 1 }));
}

export function orderedMarkers(result: ScanResult): ScanMarker[] {
  return [...result.markers].sort((a, b) => a.n - b.n);
}
