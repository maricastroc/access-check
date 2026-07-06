import { describe, expect, it } from "vitest";
import { withBudget } from "./budget";

const delay = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("withBudget", () => {
  it("retorna o valor quando termina dentro do orçamento", async () => {
    const r = await withBudget(() => delay(10, "ok"), 100, "fallback");
    expect(r).toEqual({ value: "ok", timedOut: false });
  });

  it("retorna o fallback com timedOut quando estoura o orçamento", async () => {
    const r = await withBudget(() => delay(100, "ok"), 10, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: true });
  });

  it("orçamento <= 0 estoura imediatamente", async () => {
    const r = await withBudget(() => delay(10, "ok"), 0, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: true });
  });

  it("tarefa que rejeita vira fallback sem marcar timedOut", async () => {
    const r = await withBudget(() => Promise.reject(new Error("boom")), 100, "fallback");
    expect(r).toEqual({ value: "fallback", timedOut: false });
  });
});
