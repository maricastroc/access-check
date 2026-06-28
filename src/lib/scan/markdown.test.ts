import { describe, expect, it } from "vitest";
import { buildMarkdown, markdownFilename } from "./markdown";
import type { ScanResult, ScanViolation } from "./types";

const violation = (over: Partial<ScanViolation> = {}): ScanViolation => ({
  id: "color-contrast",
  severity: "serious",
  title: "Elements must meet contrast threshold",
  criterion: "1.4.3",
  where: ".btn",
  desc: "Low contrast text.",
  fix: "Use #1a1a1a",
  nodes: 1,
  ...over,
});

const result = (over: Partial<ScanResult> = {}): ScanResult => ({
  url: "https://example.com",
  finalUrl: "https://example.com",
  title: "Example",
  scannedElements: 42,
  durationMs: 3200,
  screenshot: null,
  score: 78,
  counts: { critical: 0, serious: 1, moderate: 0, minor: 0, passed: 12, bestPractice: 0, manualReview: 0 },
  summary: "A couple of serious issues remain.",
  violations: [violation()],
  incomplete: [] as import("./types").ScanIncomplete[],
  bestPractice: [] as import("./types").ScanBestPractice[],
  passed: ["Document has a title"],
  markers: [],
  fixFirst: [{ n: "01", title: "Fix contrast", effort: "2 min", impact: "High" }],
  ...over,
});

describe("buildMarkdown", () => {
  it("inclui cabeçalho, score e resumo", () => {
    const md = buildMarkdown(result());
    expect(md).toContain("# Accessibility report — Example");
    expect(md).toContain("**Score:** 78 / 100");
    expect(md).toContain("A couple of serious issues remain.");
  });

  it("monta a tabela de contagens", () => {
    const md = buildMarkdown(result());
    expect(md).toContain("| Critical | Serious | Moderate | Minor | Passed |");
    expect(md).toContain("| 0 | 1 | 0 | 0 | 12 |");
  });

  it("emite grupos de fix com code, contagem e verificação", () => {
    const md = buildMarkdown(
      result({
        violations: [
          violation({
            fixGroups: [
              {
                text: "Replace text color",
                code: "color: #1a1a1a;",
                count: 14,
                selectors: [".btn"],
                verification: "verified",
              },
            ],
          }),
        ],
      }),
    );
    expect(md).toContain("```\ncolor: #1a1a1a;\n```");
    expect(md).toContain("Resolves 14 elements");
    expect(md).toContain("Verified");
  });

  it("cai pro fix simples quando não há grupos", () => {
    expect(buildMarkdown(result())).toContain("Use #1a1a1a");
  });

  it("celebra quando não há violações", () => {
    const md = buildMarkdown(result({ violations: [] }));
    expect(md).toContain("No automated violations detected");
  });

  it("nunca deixa 3+ quebras de linha seguidas", () => {
    expect(buildMarkdown(result())).not.toMatch(/\n{3,}/);
  });
});

describe("markdownFilename", () => {
  it("deriva um slug seguro do host", () => {
    expect(markdownFilename(result({ finalUrl: "https://www.Example.com/path" }))).toBe(
      "accesscheck-www-example-com.md",
    );
  });
});
