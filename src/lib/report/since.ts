import type { ScanResult, Severity } from "@/lib/scan/types";
import { workQueue, type FindingKind, type FindingView } from "./findings";
import { occurrencesOf } from "./occurrences";
import { standingOf, type Standing } from "./standing";

export type ClearedFinding = { id: string; n: number; title: string };

export type SinceLast = {
  cleared: ClearedFinding[];
  added: FindingView[];
  still: number;
  before: Standing;
  after: Standing;
  because: { holds: Severity; count: number } | null;
};

const RAN: Partial<Record<FindingKind, (r: ScanResult) => boolean>> = {
  keyboard: (r) => r.keyboard !== undefined && !r.keyboard.truncated,
  context: (r) => r.contexts !== undefined,
  "target-size": (r) => r.audits?.targetSize !== undefined,
  "reduced-motion": (r) => r.audits?.reducedMotion !== undefined,
  "live-regions": (r) => r.audits?.liveRegions !== undefined,
};

const HOLDS: Partial<Record<Standing, Severity>> = {
  blocked: "critical",
  failing: "serious",
};

export function findingKeys(f: FindingView): string[] {
  const located = occurrencesOf(f).map((o) => o.selector);
  const selectors = located.length > 0 ? located : f.affectedSelectors;
  return selectors.length > 0 ? selectors.map((s) => `${f.id}|${s}`) : [`${f.id}|`];
}

function toFix(result: ScanResult): FindingView[] {
  return workQueue(result).find((g) => g.group === "fix")?.findings ?? [];
}

export function sinceLast(before: ScanResult, after: ScanResult): SinceLast {
  const comparable = (f: FindingView) => {
    const ran = RAN[f.kind];
    return !ran || (ran(before) && ran(after));
  };
  const now = toFix(after);
  const old = toFix(before).filter(comparable);
  const compared = now.filter(comparable);
  const oldKeys = new Set(old.flatMap(findingKeys));
  const nowKeys = new Set(compared.flatMap(findingKeys));

  const cleared = old
    .filter((f) => !findingKeys(f).some((k) => nowKeys.has(k)))
    .map(({ id, n, title }) => ({ id, n, title }));
  const added = compared.filter((f) => !findingKeys(f).some((k) => oldKeys.has(k)));
  const standing = standingOf(after.counts);
  const holding = HOLDS[standing];
  const newOnes = holding ? added.filter((f) => f.severity === holding).length : 0;
  const elsewhere = now.some((f) => !added.includes(f) && f.severity === holding);

  return {
    cleared,
    added,
    still: compared.length - added.length,
    before: standingOf(before.counts),
    after: standing,
    because: holding && newOnes > 0 && !elsewhere ? { holds: holding, count: newOnes } : null,
  };
}
