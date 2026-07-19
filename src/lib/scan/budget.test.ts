import { describe, expect, it } from "vitest";
import { withBudget } from "./budget";

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
