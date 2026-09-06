import { redis } from "../redis";
import { prisma } from "../prisma";

export type DependencyStatus = "ok" | "degraded" | "absent";

export interface DependencyReport {
  name: string;
  status: DependencyStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  checkedAt: string;
  dependencies: DependencyReport[];
}

const PROBE_TIMEOUT_MS: Record<string, number> = {
  cache: 2_000,
  database: 8_000,
  queue: 2_000,
};
const DEFAULT_PROBE_TIMEOUT_MS = 2_000;

async function bounded<T>(work: Promise<T>, capMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`probe exceeded ${capMs}ms`)), capMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function timed(
  name: string,
  configured: boolean,
  probe: () => Promise<unknown>,
): Promise<DependencyReport> {
  if (!configured) {
    return { name, status: "absent", latencyMs: null, detail: "not configured" };
  }
  const started = Date.now();
  try {
    await bounded(probe(), PROBE_TIMEOUT_MS[name] ?? DEFAULT_PROBE_TIMEOUT_MS);
    return { name, status: "ok", latencyMs: Date.now() - started };
  } catch (error) {
    return {
      name,
      status: "degraded",
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkHealth(): Promise<HealthReport> {
  const dependencies = await Promise.all([
    timed("cache", redis !== null, () => redis!.ping()),
    timed("database", Boolean(process.env.DATABASE_URL), () => prisma.$queryRaw`SELECT 1`),
    timed("queue", Boolean(process.env.QSTASH_TOKEN), async () => undefined),
  ]);

  return {
    status: dependencies.some((d) => d.status === "degraded") ? "degraded" : "ok",
    checkedAt: new Date().toISOString(),
    dependencies,
  };
}
