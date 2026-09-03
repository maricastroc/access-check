import { describe, expect, it, vi } from "vitest";
import { waitForContentReady } from "./page-ready";

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("waitForContentReady", () => {
  it("settles once the signature repeats", async () => {
    const clock = fakeClock();
    const signatures = ["10|1|50", "40|2|900", "40|2|900", "40|2|900"];
    let i = 0;
    const probe = vi.fn(async () => signatures[Math.min(i++, signatures.length - 1)]);

    const r = await waitForContentReady(probe, clock.sleep, {
      maxMs: 5_000,
      sampleMs: 200,
      now: clock.now,
    });

    expect(r.settled).toBe(true);
    expect(r.samples).toBe(4);
  });

  it("keeps waiting while the page is still growing", async () => {
    const clock = fakeClock();
    let nodes = 10;
    const probe = vi.fn(async () => `${(nodes += 10)}|1|0`);

    const r = await waitForContentReady(probe, clock.sleep, {
      maxMs: 1_000,
      sampleMs: 200,
      now: clock.now,
    });

    expect(r.settled).toBe(false);
    expect(r.ms).toBeLessThanOrEqual(1_000);
  });

  it("gives up at the ceiling instead of hanging on a page that never settles", async () => {
    const clock = fakeClock();
    let n = 0;
    const probe = vi.fn(async () => `${n++}`);

    const r = await waitForContentReady(probe, clock.sleep, {
      maxMs: 800,
      sampleMs: 200,
      now: clock.now,
    });

    expect(r.settled).toBe(false);
    expect(probe.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("does nothing when there is no budget left", async () => {
    const probe = vi.fn(async () => "x");
    const r = await waitForContentReady(probe, async () => undefined, { maxMs: 0 });

    expect(r).toEqual({ ms: 0, settled: false, samples: 0 });
    expect(probe).not.toHaveBeenCalled();
  });

  it("treats an unreadable page as unstable rather than settled", async () => {
    const clock = fakeClock();
    const probe = vi.fn(async () => null);

    const r = await waitForContentReady(probe, clock.sleep, {
      maxMs: 600,
      sampleMs: 200,
      now: clock.now,
    });

    expect(r.settled).toBe(false);
  });

  it("honours a stricter stableSamples requirement", async () => {
    const clock = fakeClock();
    const probe = vi.fn(async () => "same");

    const r = await waitForContentReady(probe, clock.sleep, {
      maxMs: 5_000,
      sampleMs: 100,
      stableSamples: 3,
      now: clock.now,
    });

    expect(r.settled).toBe(true);
    expect(r.samples).toBe(4);
  });
});
