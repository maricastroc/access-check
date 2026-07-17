export type Budgeted<T> = { value: T; timedOut: boolean };

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
