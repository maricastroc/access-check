import { describe, expect, it } from "vitest";
import { buildFixFirst, buildSummary, computeScore } from "./derive";
import type { ScanViolation, Severity } from "./types";

const v = (severity: Severity, nodes = 1, id = "rule"): ScanViolation => ({
  id,
  severity,
  title: `${severity} issue`,
  criterion: "1.1.1",
  where: "body",
  desc: "desc",
  fix: "fix",
  nodes,
});

describe("computeScore", () => {
  it("página sem violações pontua 100", () => {
    expect(computeScore([])).toBe(100);
  });

  it("violação crítica derruba o score", () => {
    expect(computeScore([v("critical", 3)])).toBeLessThan(100);
  });

  it("mais ocorrências nunca aumentam o score", () => {
    const um = computeScore([v("serious", 1)]);
    const muitos = computeScore([v("serious", 5)]);
    expect(muitos).toBeLessThanOrEqual(um);
  });

  it("severidade maior penaliza mais que menor", () => {
    expect(computeScore([v("critical")])).toBeLessThan(computeScore([v("minor")]));
  });

  it("nunca sai do intervalo 0–100", () => {
    const muitas = Array.from({ length: 50 }, () => v("critical", 5));
    const s = computeScore(muitas);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("buildFixFirst", () => {
  it("ordena por severidade e devolve no máximo 4, numerados", () => {
    const top = buildFixFirst([v("minor"), v("critical"), v("moderate"), v("serious"), v("minor")]);
    expect(top).toHaveLength(4);
    expect(top[0].impact).toBe("High");
    expect(top[0].n).toBe("01");
    expect(top[3].n).toBe("04");
  });

  it("desempata por número de ocorrências", () => {
    const [first] = buildFixFirst([v("serious", 2, "a"), v("serious", 9, "b")]);
    expect(first.title).toBe("serious issue");
    expect(first.effort).toBeDefined();
  });

  it("effort é qualitativo, nunca tempo cravado (sem falsa precisão)", () => {
    const items = buildFixFirst([
      v("critical", 1, "color-contrast"),
      v("serious", 1, "label"),
      v("moderate", 1, "heading-order"),
    ]);
    for (const item of items) {
      expect(["Quick", "Moderate", "Involved"]).toContain(item.effort);
      expect(item.effort).not.toMatch(/min/);
    }
  });
});

describe("buildSummary", () => {
  it("destaca críticas quando há", () => {
    expect(buildSummary({ critical: 2, serious: 0, moderate: 0 })).toMatch(/critical/);
  });
  it("cai pra serious, depois moderate", () => {
    expect(buildSummary({ critical: 0, serious: 1, moderate: 0 })).toMatch(/serious/);
    expect(buildSummary({ critical: 0, serious: 0, moderate: 3 })).toMatch(/moderate/i);
  });
  it("celebra quando está tudo limpo", () => {
    expect(buildSummary({ critical: 0, serious: 0, moderate: 0 })).toMatch(/Excellent/i);
  });
});
