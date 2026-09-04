import type { FixGroup, ScanMarker, ScanResult, ScanViolation, Severity } from "@/lib/scan/types";
import type { ContextIssue } from "@/lib/scan/contexts";
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
  n: number; // 1-based priority index
  kind: FindingKind;
  isWcag: boolean;
  severity: Severity | null; // null only for best-practice
  passLabel: string | null; // set for complementary + best-practice findings
  title: string;
  criterionSc: string | null;
  criterionName: string | null;
  elements: number; // affected node count
  ruleId: string;
  desc: string; // engine description (kept for reference)
  impact: string; // concrete human consequence for the "Impact on users" block
  fixText: string;
  fixCode: string | null;
  fixGroups: FixGroup[] | null;
  guidance: Guidance | null; // actionable guidance when the engine text is generic
  measurement: ContrastMeasurement | null;
  preview: ContrastPreview | null; // contrast "Original | Suggested" color preview
  verdict: Verdict; // single source of truth for the verification state
  affectedSelectors: string[]; // distinct affected element selectors
  selectors: string[]; // legacy alias of affectedSelectors
  markers: ScanMarker[]; // capture markers (the engine emits at most one per finding)
  located: boolean; // whether the located element has a capture marker
  noMarkerReason: string; // why there is no marker, when there isn't one
};

function distinct(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

function affectedFrom(v: ScanViolation): string[] {
  const fromGroups = (v.fixGroups ?? []).flatMap((g) => g.selectors);
  const all = distinct([...fromGroups, v.where].filter((s) => s && s !== "—"));
  return all;
}

function wcagFinding(v: ScanViolation, markers: ScanMarker[], verifySkipped: boolean): Omit<FindingView, "n"> {
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
    // The preview shows the located element's own color pair, so its confidence
    // is graded from that element's re-audit (v.verification), not the aggregate.
    preview: buildContrastPreview(measurement, v.verification, v.nodes),
    verdict,
    affectedSelectors: affected,
    selectors: affected,
    markers: linked,
    located: linked.length > 0,
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
    desc: `Surfaced only in this context (${where}) — it does not fail on the initial desktop load.`,
    impact: humanImpact(issue.id, "context"),
    fixText: "Re-check this element in the affected context; the engine did not sandbox a fix here.",
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
      noMarkerReason: markerReason(bp.id, "best-practice", false),
    };
  });
}

/** Markers carry the axe help text as their label; a violation's title is that same help text. */
function linkMarkers(v: ScanViolation, markers: ScanMarker[]): ScanMarker[] {
  return markers.filter((m) => m.severity === v.severity && m.label === v.title);
}

function splitCriterion(criterion: string): { sc: string | null; name: string | null } {
  const m = criterion.match(/(\d+\.\d+\.\d+)/);
  const sc = m ? m[1] : null;
  const name = criterion.split(" · ")[1]?.trim() ?? null;
  return { sc, name };
}

/**
 * Ordered findings for the report margin: WCAG axe violations + complementary
 * passes (keyboard / audits / contexts) sorted by severity, then best-practice
 * items. Every field is derived once here — the single source of truth for the
 * finding, its selectors, marker, contrast values, suggestion and verdict.
 */
export function buildFindings(result: ScanResult): FindingView[] {
  const verifySkipped = (result.warnings ?? []).some((w) => w.code === "verification-skipped");
  const withSeverity: Omit<FindingView, "n">[] = [];

  for (const v of result.violations) withSeverity.push(wcagFinding(v, result.markers, verifySkipped));

  for (const f of result.keyboard?.findings ?? [])
    withSeverity.push(complementaryFinding(f, "keyboard"));

  for (const f of result.audits?.targetSize?.findings ?? [])
    withSeverity.push(complementaryFinding(f, "target-size"));
  for (const f of result.audits?.reducedMotion?.findings ?? [])
    withSeverity.push(complementaryFinding(f, "reduced-motion"));
  for (const f of result.audits?.liveRegions?.findings ?? [])
    withSeverity.push(complementaryFinding(f, "live-regions"));

  const ctx = result.contexts;
  if (ctx) {
    for (const issue of ctx.mobile.onlyOnMobile)
      withSeverity.push(contextFinding(issue, `${ctx.mobile.width}px viewport`));
    for (const state of ctx.dynamic.states)
      for (const issue of state.newIssues) withSeverity.push(contextFinding(issue, state.label));
  }

  withSeverity.sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(a.severity as Severity);
    const sb = SEVERITY_ORDER.indexOf(b.severity as Severity);
    if (sa !== sb) return sa - sb;
    return b.elements - a.elements;
  });

  const ordered = [...withSeverity, ...bestPracticeFindings(result)];
  return ordered.map((f, i) => ({ ...f, n: i + 1 }));
}

/** All capture markers in reading order (n ascending) — the Evidence Lens layer. */
export function orderedMarkers(result: ScanResult): ScanMarker[] {
  return [...result.markers].sort((a, b) => a.n - b.n);
}
