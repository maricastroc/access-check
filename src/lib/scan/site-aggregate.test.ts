import { describe, expect, it } from "vitest";
import { aggregateScore, type PageScore } from "./site-aggregate";

const p = (status: PageScore["status"], score: number | null): PageScore => ({ status, score });

describe("aggregateScore", () => {
  it("retorna null quando nenhuma página concluiu", () => {
    expect(aggregateScore([])).toBeNull();
    expect(aggregateScore([p("pending", null), p("running", null)])).toBeNull();
    expect(aggregateScore([p("failed", null)])).toBeNull();
  });

  it("faz a média só das páginas concluídas, arredondando", () => {
    expect(aggregateScore([p("done", 90), p("done", 80)])).toBe(85);
    expect(aggregateScore([p("done", 90), p("done", 81)])).toBe(86);
  });

  it("ignora páginas não concluídas e sem score no cálculo", () => {
    const pages = [p("done", 100), p("failed", null), p("pending", null), p("done", 50)];
    expect(aggregateScore(pages)).toBe(75);
  });
});
