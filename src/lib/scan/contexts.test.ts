import { describe, expect, it } from "vitest";
import { newIssues, toContextIssue, type RawRule } from "./contexts";

const rule = (over: Partial<RawRule> = {}): RawRule => ({
  id: "target-size",
  impact: "serious",
  help: "Touch targets must be big enough",
  tags: ["wcag22aa", "wcag258"],
  nodeCount: 3,
  selectors: ["a.x", "a.y", "a.z", "a.w", "a.v", "a.extra"],
  ...over,
});

describe("toContextIssue", () => {
  it("mapeia impact→severity, tags→critério e trunca seletores", () => {
    const issue = toContextIssue(rule());
    expect(issue.severity).toBe("serious");
    expect(issue.criterion).toBe("WCAG 2.5.8 · Target Size (Minimum)");
    expect(issue.nodes).toBe(3);
    expect(issue.selectors).toHaveLength(5); // teto
  });

  it("cai pra 'minor' quando o impact é nulo e pro id quando não há critério", () => {
    const issue = toContextIssue(rule({ impact: null, tags: ["cat.foo"], id: "custom" }));
    expect(issue.severity).toBe("minor");
    expect(issue.criterion).toBe("custom");
  });
});

describe("newIssues", () => {
  it("mantém só as regras que não estão na baseline do desktop", () => {
    const baseline = new Set(["color-contrast", "image-alt"]);
    const rules = [
      rule({ id: "color-contrast" }), // já existia no desktop → ignora
      rule({ id: "target-size" }), // novo → mantém
      rule({ id: "meta-viewport" }), // novo → mantém
    ];
    const out = newIssues(baseline, rules);
    expect(out.map((i) => i.id)).toEqual(["target-size", "meta-viewport"]);
  });

  it("baseline vazia mantém tudo; nenhuma regra mantém nada", () => {
    expect(newIssues(new Set(), [rule({ id: "a" }), rule({ id: "b" })])).toHaveLength(2);
    expect(newIssues(new Set(["a"]), [])).toHaveLength(0);
  });
});
