import { afterEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({ current: null as { ping: () => Promise<unknown> } | null }));
const prismaMock = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../redis", () => ({
  get redis() {
    return redisMock.current;
  },
}));

vi.mock("../prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => prismaMock.query(...args),
  },
}));

const { checkHealth } = await import("./health");

const ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ENV };
  redisMock.current = null;
  prismaMock.query.mockReset();
  vi.useRealTimers();
});

function reportFor(name: string, report: Awaited<ReturnType<typeof checkHealth>>) {
  const found = report.dependencies.find((d) => d.name === name);
  if (!found) throw new Error(`no report for ${name}`);
  return found;
}

describe("health probes", () => {
  it("reports a reachable dependency as ok, with the latency it took", async () => {
    redisMock.current = { ping: async () => "PONG" };
    prismaMock.query.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgres://example";

    const report = await checkHealth();

    expect(reportFor("cache", report).status).toBe("ok");
    expect(reportFor("cache", report).latencyMs).toBeGreaterThanOrEqual(0);
    expect(reportFor("database", report).status).toBe("ok");
    expect(report.status).toBe("ok");
  });

  it("reports a dependency that throws as degraded, and says why", async () => {
    redisMock.current = {
      ping: async () => {
        throw new Error("ECONNREFUSED");
      },
    };
    prismaMock.query.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgres://example";

    const report = await checkHealth();

    expect(reportFor("cache", report).status).toBe("degraded");
    expect(reportFor("cache", report).detail).toContain("ECONNREFUSED");
    expect(report.status).toBe("degraded");
  });

  it("separates 'switched off' from 'broken'", async () => {
    redisMock.current = null;
    prismaMock.query.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgres://example";
    delete process.env.QSTASH_TOKEN;

    const report = await checkHealth();

    expect(reportFor("cache", report).status).toBe("absent");
    expect(reportFor("queue", report).status).toBe("absent");
    expect(report.status).toBe("ok");
  });

  it("gives up on a probe that never answers instead of hanging with it", async () => {
    redisMock.current = { ping: () => new Promise(() => undefined) };
    prismaMock.query.mockResolvedValue([{ "?column?": 1 }]);
    process.env.DATABASE_URL = "postgres://example";

    const started = Date.now();
    const report = await checkHealth();

    expect(reportFor("cache", report).status).toBe("degraded");
    expect(reportFor("cache", report).detail).toMatch(/exceeded/);
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 10_000);
});
