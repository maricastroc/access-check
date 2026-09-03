import { describe, expect, it } from "vitest";
import { Budget } from "./budget";
import { assemblyReserveFor, OPTIONAL_ORDER, ScanPolicy, STAGES, type StageId } from "./policy";
import type { ScanWarningCode } from "./types";

const TEXT = {
  "screenshot-unavailable": "no preview",
  "fix-details-skipped": "generic fixes",
  "markers-skipped": "no markers",
  "content-unsettled": "still loading",
  "verification-skipped": "not verified",
  "audits-skipped": "no extra audits",
  "keyboard-skipped": "no keyboard pass",
  "contexts-skipped": "no contexts pass",
  "stream-interrupted": "cut short",
} satisfies Record<ScanWarningCode, string>;

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function makePolicy(totalMs: number, finalizeReserve = 0, reserve?: number) {
  const c = clock();
  const budget = new Budget(totalMs, finalizeReserve, c.now);
  return { policy: new ScanPolicy(budget, TEXT, reserve), advance: c.advance, budget };
}

describe("stage catalogue", () => {
  it("keeps the essentials free of skip warnings so they fail loudly instead", () => {
    expect(STAGES.navigation.warning).toBeUndefined();
    expect(STAGES.axe.warning).toBeUndefined();
  });

  it("orders the optional ladder so the costliest passes are dropped first", () => {
    expect(OPTIONAL_ORDER).toEqual(["verify", "audits", "screenshot", "keyboard", "contexts"]);
    const last = OPTIONAL_ORDER.slice(-2);
    expect(last).toEqual(["keyboard", "contexts"]);
    for (const id of last) {
      expect(STAGES[id].minMs).toBeGreaterThanOrEqual(STAGES.screenshot.minMs);
    }
  });

  it("scales the assembly reserve down with the budget", () => {
    expect(assemblyReserveFor(60_000)).toBe(6_000);
    expect(assemblyReserveFor(8_000)).toBe(1_200);
    expect(assemblyReserveFor(0)).toBe(0);
  });
});

describe("ScanPolicy allowances", () => {
  it("holds the assembly reserve back from essential stages", () => {
    const { policy } = makePolicy(40_000, 0, 6_000);
    expect(policy.allowance("axe")).toBe(20_000);
    expect(policy.allowance("navigation")).toBe(15_000);
  });

  it("lets assembly stages spend the reserve the essentials could not touch", () => {
    const { policy, advance } = makePolicy(10_000, 0, 6_000);
    advance(6_000);
    expect(policy.allowance("axe")).toBe(0);
    expect(policy.allowance("element-info")).toBe(4_000);
  });

  it("keeps optional stages out until the reserve is released", () => {
    const { policy, advance } = makePolicy(12_000, 0, 6_000);
    advance(4_000);
    expect(policy.canRun("keyboard")).toBe(true);
    advance(4_000);
    expect(policy.allowance("keyboard")).toBe(4_000);
    expect(policy.canRun("keyboard")).toBe(true);
    advance(2_000);
    expect(policy.canRun("keyboard")).toBe(false);
  });

  it("never proposes a negative allowance", () => {
    const { policy, advance } = makePolicy(5_000, 1_000, 2_000);
    advance(99_000);
    for (const id of Object.keys(STAGES) as StageId[]) {
      expect(policy.allowance(id)).toBe(0);
    }
  });
});

describe("ScanPolicy degradation", () => {
  it("runs a stage that fits and records nothing", async () => {
    const { policy } = makePolicy(40_000);
    const out = await policy.run("keyboard", async () => "done", "fallback");

    expect(out).toMatchObject({ value: "done", ran: true, skipped: false, timedOut: false });
    expect(policy.warnings()).toEqual([]);
    expect(policy.partial).toBe(false);
  });

  it("skips a stage that no longer fits and warns for exactly that stage", async () => {
    const { policy, advance } = makePolicy(10_000);
    policy.releaseAssemblyReserve();
    advance(8_000);

    const out = await policy.run("keyboard", async () => "done", "fallback");

    expect(out).toMatchObject({ value: "fallback", ran: false, skipped: true });
    expect(policy.warnings().map((w) => w.code)).toEqual(["keyboard-skipped"]);
    expect(policy.wasSkipped("keyboard")).toBe(true);
    expect(policy.wasSkipped("contexts")).toBe(false);
  });

  it("warns when a stage starts but overruns its allowance", async () => {
    const budget = new Budget(40_000, 0);
    const policy = new ScanPolicy(budget, TEXT);
    policy.releaseAssemblyReserve();

    const out = await policy.run(
      "screenshot",
      () => new Promise((r) => setTimeout(() => r("late"), 400)),
      null,
    );

    expect(out.timedOut).toBe(false);
    expect(out.value).toBe("late");

    const slow = new ScanPolicy(new Budget(40_000, 0), TEXT, 0);
    const stuck = await slow.run(
      "screenshot",
      () => new Promise((r) => setTimeout(() => r("late"), 9_000)),
      null,
    );
    expect(stuck.timedOut).toBe(true);
    expect(stuck.value).toBeNull();
    expect(slow.warnings().map((w) => w.code)).toEqual(["screenshot-unavailable"]);
  }, 20_000);

  it("marks the report partial only for stages that change the audit", () => {
    const presentation = new ScanPolicy(new Budget(1_000, 0), TEXT);
    presentation.skip("screenshot");
    presentation.skip("markers");
    expect(
      presentation
        .warnings()
        .map((w) => w.code)
        .sort(),
    ).toEqual(["markers-skipped", "screenshot-unavailable"]);
    expect(presentation.partial).toBe(false);

    const substantive = new ScanPolicy(new Budget(1_000, 0), TEXT);
    substantive.skip("keyboard");
    expect(substantive.partial).toBe(true);
  });

  it("never repeats the same warning", () => {
    const { policy } = makePolicy(1_000);
    policy.skip("audits");
    policy.skip("audits");
    policy.warn("audits-skipped");
    expect(policy.warnings()).toHaveLength(1);
  });

  it("passes the remaining allowance into the stage so it can self-limit", async () => {
    const { policy, advance } = makePolicy(20_000, 0, 0);
    policy.releaseAssemblyReserve();
    advance(14_000);

    let seen = -1;
    await policy.run(
      "keyboard",
      async (allowanceMs) => {
        seen = allowanceMs;
        return "ok";
      },
      "fallback",
    );

    expect(seen).toBe(6_000);
  });

  it("carries a human message with every warning", () => {
    const { policy } = makePolicy(1_000);
    for (const id of OPTIONAL_ORDER) policy.skip(id);
    for (const w of policy.warnings()) expect(w.message.length).toBeGreaterThan(0);
    expect(policy.warnings()).toHaveLength(OPTIONAL_ORDER.length);
  });
});
