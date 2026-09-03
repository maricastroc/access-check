import { describe, expect, it } from "vitest";
import { Budget, withBudget } from "./budget";

const delay = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("withBudget", () => {
  it("returns the value when it finishes within budget", async () => {
    const r = await withBudget(() => delay(10, "ok"), 100, "fallback");
    expect(r).toEqual({ value: "ok", timedOut: false });
  });

  it("returns the fallback with timedOut when it exceeds the budget", async () => {
    const r = await withBudget(() => delay(100, "ok"), 10, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: true });
  });

  it("budget <= 0 times out immediately", async () => {
    const r = await withBudget(() => delay(10, "ok"), 0, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: true });
  });

  it("a task that rejects becomes fallback without marking timedOut", async () => {
    const r = await withBudget(() => Promise.reject(new Error("boom")), 100, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: false });
  });
});

describe("Budget", () => {
  function clock(start = 0) {
    let t = start;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  }

  it("reports what is left after time passes", () => {
    const c = clock();
    const b = new Budget(10_000, 0, c.now);

    expect(b.remaining()).toBe(10_000);
    c.advance(4_000);
    expect(b.elapsed()).toBe(4_000);
    expect(b.remaining()).toBe(6_000);
  });

  it("holds back the reserve so the result can still be sent", () => {
    const c = clock();
    const b = new Budget(10_000, 2_500, c.now);

    expect(b.spendable()).toBe(7_500);
    c.advance(9_000);
    expect(b.remaining()).toBe(1_000);
    expect(b.spendable()).toBe(0);
  });

  it("never reports negative time", () => {
    const c = clock();
    const b = new Budget(1_000, 500, c.now);
    c.advance(9_999);

    expect(b.remaining()).toBe(0);
    expect(b.spendable()).toBe(0);
    expect(b.slice(5_000)).toBe(0);
  });

  it("refuses an optional step that no longer fits", () => {
    const c = clock();
    const b = new Budget(10_000, 2_500, c.now);

    expect(b.allows(5_000)).toBe(true);
    c.advance(6_000);
    expect(b.allows(5_000)).toBe(false);
    expect(b.allows(1_000)).toBe(true);
  });

  it("caps a step at whatever budget is left", () => {
    const c = clock();
    const b = new Budget(10_000, 2_000, c.now);

    expect(b.slice(3_000)).toBe(3_000);
    c.advance(6_500);
    expect(b.slice(3_000)).toBe(1_500);
  });

  it("runs a step under the remaining budget and falls back when it overruns", async () => {
    const b = new Budget(120, 0);
    const slow = await b.run(
      () => new Promise((r) => setTimeout(() => r("late"), 400)),
      60,
      "fell",
    );
    expect(slow).toEqual({ value: "fell", timedOut: true });

    const quick = await b.run(async () => "made it", 60, "fell");
    expect(quick.value).toBe("made it");
  });

  it("times out an exhausted budget immediately without running the step", async () => {
    const c = clock();
    const b = new Budget(1_000, 0, c.now);
    c.advance(2_000);

    let ran = false;
    const r = await b.run(
      async () => {
        ran = true;
        return "x";
      },
      500,
      "fallback",
    );

    expect(r).toEqual({ value: "fallback", timedOut: true });
    expect(ran).toBe(false);
  });
});
