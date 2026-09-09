import { describe, expect, it } from "vitest";
import { buildReportMarkdown } from "../report/markdown";
import { buildMarkdown } from "../scan/markdown";
import { withScoring } from "../scan/scored";
import type { ReportLocale } from "./locale";
import type { ScanResult } from "../scan/types";

function result(locale: ReportLocale): ScanResult {
  return withScoring({
    locale,
    url: "https://exemplo.com",
    finalUrl: "https://exemplo.com",
    title: "Exemplo",
    scannedElements: 42,
    durationMs: 1200,
    screenshot: null,
    counts: { passed: 39, bestPractice: 2, manualReview: 4 },
    violations: [],
    incomplete: [],
    bestPractice: [],
    passed: ["Regra A"],
    markers: [],
    partial: false,
  } as never);
}

describe("Markdown exports follow the report locale", () => {
  it("writes the priority-score report in Portuguese", () => {
    const md = buildReportMarkdown(result("pt-BR"));

    expect(md).toContain("# Relatório de acessibilidade:");
    expect(md).toContain("Nota interna de prioridade");
    expect(md).toContain("## Leitura WCAG");
    expect(md).not.toContain("Accessibility report");
    expect(md).not.toContain("Internal priority score");
    expect(md).not.toContain("WCAG reading");
  });

  it("keeps the English report untouched", () => {
    const md = buildReportMarkdown(result("en"));

    expect(md).toContain("# Accessibility report:");
    expect(md).toContain("Internal priority score");
    expect(md).toContain("## WCAG reading");
    expect(md).not.toContain("Relatório");
  });

  it("writes the scan export in Portuguese", () => {
    const md = buildMarkdown(result("pt-BR"));

    expect(md).toContain("## Resumo");
    expect(md).toContain("## Violações");
    expect(md).toContain("| Críticos | Graves | Moderados | Leves | Aprovadas |");
    expect(md).not.toContain("## Summary");
    expect(md).not.toContain("| Critical | Serious |");
  });

  it("keeps the English scan export untouched", () => {
    const md = buildMarkdown(result("en"));

    expect(md).toContain("## Summary");
    expect(md).toContain("| Critical | Serious | Moderate | Minor | Passed |");
    expect(md).not.toContain("## Resumo");
  });

  it("localizes the score summary that opens both exports", () => {
    expect(result("pt-BR").summary).toMatch(/[çãáéíó]/);
    expect(result("en").summary).not.toMatch(/[çãõ]/);
  });
});
