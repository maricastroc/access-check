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

export class Budget {
  private readonly startedAt: number;

  constructor(
    private readonly totalMs: number,
    private readonly reserveMs = 0,
    private readonly now: () => number = Date.now,
  ) {
    this.startedAt = now();
  }

  total(): number {
    return this.totalMs;
  }

  elapsed(): number {
    return this.now() - this.startedAt;
  }

  remaining(): number {
    return Math.max(0, this.totalMs - this.elapsed());
  }

  spendable(): number {
    return Math.max(0, this.remaining() - this.reserveMs);
  }

  allows(ms: number): boolean {
    return this.spendable() >= ms;
  }

  slice(maxMs: number): number {
    return Math.min(maxMs, this.spendable());
  }

  async run<T>(fn: () => Promise<T>, maxMs: number, fallback: T): Promise<Budgeted<T>> {
    return withBudget(fn, this.slice(maxMs), fallback);
  }
}
