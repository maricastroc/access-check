import type {
  FixGroup,
  FixVerification,
  ScanMarker,
  ScanResult,
  ScanViolation,
  Severity,
} from "@/lib/scan/types";
import type { ContextIssue } from "@/lib/scan/contexts";
import { SEVERITY_META, SEVERITY_ORDER, toFixStatus, type FixStatus } from "./severity";
import { parseContrastFix, type ContrastMeasurement } from "./contrast";

export type FindingKind =
  | "wcag"
  | "keyboard"
  | "target-size"
  | "reduced-motion"
  | "live-regions"
  | "context"
  | "best-practice";

/** A pass that runs alongside axe. `null` = a plain axe WCAG rule. */
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
  desc: string; // engine description (what it is)
  who: string; // fixed human-impact line for the severity
  fixText: string;
  fixCode: string | null;
  fixGroups: FixGroup[] | null;
  fixStatus: FixStatus;
  measurement: ContrastMeasurement | null;
  selectors: string[];
  markers: ScanMarker[]; // capture occurrences linked to this finding
};

/** verified only when everything checked passed; needs-review if anything still flags. */
function statusFromOutcomes(outcomes: FixVerification[]): FixStatus {
  const checked = outcomes.filter((o) => o === "verified" || o === "failed");
  if (checked.length === 0) return "unchecked";
  return checked.every((o) => o === "verified") ? "verified" : "needs-review";
}

function violationStatus(v: ScanViolation): FixStatus {
  if (v.fixGroups && v.fixGroups.length > 0) {
    return statusFromOutcomes(v.fixGroups.map((g) => g.verification));
  }
  return toFixStatus(v.verification);
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

function wcagFinding(v: ScanViolation, markers: ScanMarker[]): Omit<FindingView, "n"> {
  const { sc, name } = splitCriterion(v.criterion);
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
    who: SEVERITY_META[v.severity].who,
    fixText: v.fix,
    fixCode: v.fixCode ?? null,
    fixGroups: v.fixGroups && v.fixGroups.length > 0 ? v.fixGroups : null,
    fixStatus: violationStatus(v),
    measurement: parseContrastFix(v.fix, v.fixCode),
    selectors: v.where && v.where !== "—" ? [v.where] : [],
    markers: linkMarkers(v, markers),
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
  return {
    id: `${kind}:${f.id}`,
    kind,
    isWcag: true, // complementary passes still map to named WCAG criteria
    severity: f.severity,
    passLabel: PASS_LABEL[kind] ?? null,
    title: f.title,
    criterionSc: sc,
    criterionName: name,
    elements: f.count,
    ruleId: f.id,
    desc: f.desc,
    who: SEVERITY_META[f.severity].who,
    fixText: f.fix,
    fixCode: null,
    fixGroups: null,
    fixStatus: "unchecked", // complementary passes are not sandbox re-audited
    measurement: null,
    selectors: f.selectors,
    markers: [],
  };
}

/** Context issues (mobile / opened states) carry no engine fix or description. */
function contextFinding(issue: ContextIssue, where: string): Omit<FindingView, "n"> {
  const { sc, name } = splitCriterion(issue.criterion);
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
    who: SEVERITY_META[issue.severity].who,
    fixText: "Re-check this element in the affected context; the engine did not sandbox a fix here.",
    fixCode: null,
    fixGroups: null,
    fixStatus: "unchecked",
    measurement: null,
    selectors: issue.selectors,
    markers: [],
  };
}

function bestPracticeFindings(result: ScanResult): Omit<FindingView, "n">[] {
  return result.bestPractice.map((bp) => ({
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
    who: "Best practice (not a WCAG success criterion).",
    fixText: bp.desc,
    fixCode: null,
    fixGroups: null,
    fixStatus: "unchecked" as const,
    measurement: null,
    selectors: bp.selectors,
    markers: [],
  }));
}

/**
 * Ordered findings for the report margin: WCAG axe violations + complementary
 * passes (keyboard / audits / contexts) sorted by severity, then best-practice
 * items (no WCAG severity). Every field comes straight from ScanResult — nothing
 * is recomputed or invented.
 */
export function buildFindings(result: ScanResult): FindingView[] {
  const withSeverity: Omit<FindingView, "n">[] = [];

  for (const v of result.violations) withSeverity.push(wcagFinding(v, result.markers));

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
