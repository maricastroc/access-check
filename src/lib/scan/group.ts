import type { FixApply, FixResult } from "./remediate";
import type { FixConfidence, FixVerification } from "./types";

export const MAX_GROUP_SELECTORS = 20;

export type FixCluster = {
  text: string;
  code?: string;
  apply?: FixApply;
  confidence: FixConfidence;
  count: number;
  selectors: string[];
  verification?: FixVerification;
};

export function isVerifiable(cluster: FixCluster): cluster is FixCluster & { apply: FixApply } {
  return cluster.confidence === "deterministic" && cluster.apply !== undefined;
}

export function clusterFixes(
  perNode: { selector: string | null; result: FixResult | null }[],
): FixCluster[] {
  const map = new Map<string, FixCluster>();
  for (const { selector, result } of perNode) {
    if (!result) continue;

    const sig = `${result.confidence}:${result.code ?? result.text}`;
    let cluster = map.get(sig);
    if (!cluster) {
      cluster = {
        text: result.text,
        code: result.code,
        apply: result.apply,
        confidence: result.confidence,
        count: 0,
        selectors: [],
      };
      map.set(sig, cluster);
    }
    cluster.count++;
    if (selector && cluster.selectors.length < MAX_GROUP_SELECTORS)
      cluster.selectors.push(selector);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
