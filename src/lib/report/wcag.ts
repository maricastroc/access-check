export type WcagLevel = "A" | "AA" | "AAA";

export const SC_LEVEL: Record<string, WcagLevel> = {
  "1.1.1": "A",
  "1.3.1": "A",
  "1.3.5": "AA",
  "1.4.1": "A",
  "1.4.3": "AA",
  "1.4.4": "AA",
  "1.4.10": "AA",
  "1.4.11": "AA",
  "2.1.1": "A",
  "2.4.1": "A",
  "2.4.2": "A",
  "2.4.4": "A",
  "2.4.7": "AA",
  "2.5.8": "AA",
  "3.1.1": "A",
  "3.3.2": "A",
  "4.1.2": "A",
};

export type ParsedCriterion = { sc: string | null; name: string | null; raw: string };

export function parseCriterion(criterion: string): ParsedCriterion {
  const raw = criterion.trim();
  const m = raw.match(/(\d+\.\d+\.\d+)/);
  const sc = m ? m[1] : null;
  const afterDot = raw.split(" · ")[1];
  const name = afterDot ? afterDot.trim() : null;
  return { sc, name, raw };
}

export type WcagCriterionRef = { sc: string; name: string | null };

export type WcagReadingModel = {
  a: { fails: boolean; criteria: WcagCriterionRef[] };
  aa: { fails: boolean; criteria: WcagCriterionRef[] };
  aaa: { evaluated: false };
};

export function buildWcagReading(violations: { criterion: string }[]): WcagReadingModel {
  const aSet = new Map<string, WcagCriterionRef>();
  const aaSet = new Map<string, WcagCriterionRef>();

  for (const v of violations) {
    const { sc, name } = parseCriterion(v.criterion);
    if (!sc) continue;
    const level = SC_LEVEL[sc] ?? "AA";
    const bucket = level === "A" ? aSet : aaSet;
    if (!bucket.has(sc)) bucket.set(sc, { sc, name });
  }

  const byNumber = (a: WcagCriterionRef, b: WcagCriterionRef) =>
    a.sc.localeCompare(b.sc, undefined, { numeric: true });

  const aCriteria = [...aSet.values()].sort(byNumber);
  const aaCriteria = [...aaSet.values()].sort(byNumber);

  return {
    a: { fails: aCriteria.length > 0, criteria: aCriteria },
    aa: { fails: aaCriteria.length > 0, criteria: aaCriteria },
    aaa: { evaluated: false },
  };
}
