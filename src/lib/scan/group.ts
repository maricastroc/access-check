import type { FixApply, FixResult } from "./remediate";
import type { FixVerification } from "./types";

// Teto de seletores guardados por grupo, pra não estourar o payload.
export const MAX_GROUP_SELECTORS = 20;

// Grupo interno de agrupamento: como FixGroup, mas carrega `apply` (a mutação)
// e a contagem total, que não saem no payload final.
export type FixCluster = {
  text: string;
  code?: string;
  apply?: FixApply;
  count: number;
  selectors: string[];
  verification?: FixVerification;
};

/**
 * Agrupa os nós de uma violação por assinatura do conserto. Nós cujo fix gera
 * exatamente o mesmo trecho (ex.: vários elementos com o mesmo `color: #xxx`)
 * caem no mesmo cluster — é o que vira "este fix resolve N elementos".
 */
export function clusterFixes(
  perNode: { selector: string | null; result: FixResult | null }[],
): FixCluster[] {
  const map = new Map<string, FixCluster>();
  for (const { selector, result } of perNode) {
    if (!result) continue;
    // A assinatura é o trecho copiável quando há; senão o texto em prosa.
    const sig = result.code ?? result.text;
    let cluster = map.get(sig);
    if (!cluster) {
      cluster = {
        text: result.text,
        code: result.code,
        apply: result.apply,
        count: 0,
        selectors: [],
      };
      map.set(sig, cluster);
    }
    cluster.count++;
    if (selector && cluster.selectors.length < MAX_GROUP_SELECTORS)
      cluster.selectors.push(selector);
  }
  // Maiores grupos primeiro: o conserto que cobre mais elementos é o que mais
  // compensa aplicar.
  return [...map.values()].sort((a, b) => b.count - a.count);
}
