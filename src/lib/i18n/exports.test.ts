import { describe, expect, it } from "vitest";
import { buildReportMarkdown } from "../report/markdown";
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
  it("writes the standing report in Portuguese", () => {
    const md = buildReportMarkdown(result("pt-BR"));

    expect(md).toContain("# Relatório de acessibilidade:");
    expect(md).toContain("Como esta página está");
    expect(md).toContain("## Leitura WCAG");
    expect(md).not.toContain("Accessibility report");
    expect(md).not.toContain("Where this page stands");
    expect(md).not.toContain("WCAG reading");
  });

  it("keeps the English report untouched", () => {
    const md = buildReportMarkdown(result("en"));

    expect(md).toContain("# Accessibility report:");
    expect(md).toContain("Where this page stands");
    expect(md).toContain("## WCAG reading");
    expect(md).not.toContain("Relatório");
  });

  it("localizes the score summary that opens both exports", () => {
    expect(result("pt-BR").summary).toMatch(/[çãáéíó]/);
    expect(result("en").summary).not.toMatch(/[çãõ]/);
  });
});
