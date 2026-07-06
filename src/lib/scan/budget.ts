// Orçamento de tempo pros passes opcionais do scan. Numa página pesada, os
// passes extras (verificação de fixes, teclado, contextos) podem estourar o
// teto de 60s da Vercel e derrubar a função inteira (504). Em vez disso,
// corremos cada passe contra o tempo restante: se estourar, devolvemos o
// relatório do axe (o core) marcado como parcial, sem nunca dar 504.

export type Budgeted<T> = { value: T; timedOut: boolean };

/**
 * Corre uma tarefa contra um limite de tempo. Estourou (ou budgetMs<=0) →
 * `fallback` com `timedOut: true`. A tarefa rejeitou → `fallback` com
 * `timedOut: false` (falha ≠ timeout). Nunca lança.
 */
export async function withBudget<T>(
  run: () => Promise<T>,
  budgetMs: number,
  fallback: T,
): Promise<Budgeted<T>> {
  if (budgetMs <= 0) return { value: fallback, timedOut: true };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"__timeout__">((resolve) => {
    timer = setTimeout(() => resolve("__timeout__"), budgetMs);
  });

  try {
    const settled = await Promise.race([
      run().then(
        (value) => ({ kind: "ok" as const, value }),
        () => ({ kind: "fail" as const }),
      ),
      timeout,
    ]);
    if (settled === "__timeout__") return { value: fallback, timedOut: true };
    if (settled.kind === "fail") return { value: fallback, timedOut: false };
    return { value: settled.value, timedOut: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
