import type { FixVerification } from "@/lib/scan/types";
import { certifiedVerification } from "@/lib/scan/confidence";
import type { FindingView } from "./findings";
import type { Occurrence } from "./occurrences";
import { categoryOf } from "./guidance";
import { parseContrastFix, type ContrastMeasurement } from "./contrast";

export type ThreadEnd = "tested" | "failed" | "person" | "recheck" | "untested";

export type UnnamedRole = "button" | "link" | "field" | "image";

export type ContrastReading = ContrastMeasurement & { verification: FixVerification };

export type Evidence =
  | { kind: "contrast"; reading: ContrastReading }
  | { kind: "unnamed"; role: UnnamedRole }
  | { kind: "focus" }
  | { kind: "unmeasured" }
  | { kind: "note" };

export type StationKind = "located" | "evidence" | "change" | "decide" | "verdict";

export type Chain = {
  measured: boolean;
  evidence: Evidence;
  stations: StationKind[];
  end: ThreadEnd | null;
  closed: boolean;
};

const ROLE: Record<string, UnnamedRole> = {
  "button-name": "button",
  "input-button-name": "button",
  "aria-command-name": "button",
  "link-name": "link",
  label: "field",
  "select-name": "field",
  "aria-input-field-name": "field",
  "aria-toggle-field-name": "field",
};

export function threadEnd(f: FindingView): ThreadEnd | null {
  if (f.kind === "manual-review") return "person";
  if (f.kind === "best-practice") return null;
  const v = f.verdict;
  switch (v.kind) {
    case "verified":
      return "tested";
    case "sampled":
      return v.sampledFailed > 0 ? "failed" : "tested";
    case "partial":
    case "failed":
      return "failed";
    case "contextual":
    case "no-auto-fix":
      return "person";
    case "complementary":
      return "recheck";
    default:
      return "untested";
  }
}

export function contrastReading(f: FindingView, occ: Occurrence | null): ContrastReading | null {
  const group = occ ? f.fixGroups?.find((g) => g.selectors.includes(occ.selector)) : undefined;
  if (group) {
    const reading = parseContrastFix(group.text, group.code);
    if (reading) {
      return {
        ...reading,
        verification: certifiedVerification(group.confidence ?? null, group.verification),
      };
    }
  }
  if (!f.measurement) return null;
  const verification =
    threadEnd(f) === "tested" ? "verified" : threadEnd(f) === "failed" ? "failed" : "unchecked";
  return { ...f.measurement, verification };
}

function evidenceOf(f: FindingView, occ: Occurrence | null): Evidence {
  if (f.kind === "manual-review") return { kind: "unmeasured" };
  const category = categoryOf(f.ruleId, f.kind);
  if (category === "contrast") {
    const reading = contrastReading(f, occ);
    if (reading) return { kind: "contrast", reading };
  }
  if (category === "alt") return { kind: "unnamed", role: "image" };
  if (category === "name" && ROLE[f.ruleId]) return { kind: "unnamed", role: ROLE[f.ruleId] };
  if (f.ruleId === "focus-not-visible") return { kind: "focus" };
  return { kind: "note" };
}

export function hasChange(f: FindingView): boolean {
  if (f.kind === "manual-review") return false;
  return Boolean(f.fixCode || f.guidance || f.preview || f.fixText.trim());
}

export function chainOf(f: FindingView, occ: Occurrence | null): Chain {
  const measured = !(f.kind === "manual-review" || f.evidence === "heuristic");
  const end = threadEnd(f);
  const stations: StationKind[] = ["located", "evidence"];

  if (f.kind === "manual-review") {
    stations.push("decide");
  } else {
    if (hasChange(f)) stations.push("change");
    if (end) stations.push("verdict");
  }

  return {
    measured,
    evidence: evidenceOf(f, occ),
    stations,
    end,
    closed: measured && (end === "tested" || end === "failed"),
  };
}
