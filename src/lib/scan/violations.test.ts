import { describe, expect, it } from "vitest";
import {
  attachFixGroups,
  enrichViolations,
  planVerification,
  stripFailurePrefix,
  type AxeRule,
} from "./violations";
import { translator } from "../i18n/t";

describe("stripFailurePrefix", () => {
  it("drops the English prefix axe puts above the failure list", () => {
    const summary = "Fix any of the following:\n  Element has insufficient color contrast";
    expect(stripFailurePrefix(summary)).toBe("Element has insufficient color contrast");
  });

  it("drops the Portuguese prefix the same way, with no rule of its own", () => {
    const summary =
      "Corrija qualquer um dos itens a seguir:\n  O elemento tem contraste de cor insuficiente";
    expect(stripFailurePrefix(summary)).toBe("O elemento tem contraste de cor insuficiente");
  });

  it("keeps every line of a multi-part failure list", () => {
    const summary = "Corrija todos os itens a seguir:\n  Primeiro problema\n  Segundo problema";
    expect(stripFailurePrefix(summary)).toBe("Primeiro problema\n  Segundo problema");
  });

  it("keeps a single line that has no prefix above it", () => {
    expect(stripFailurePrefix("Element has insufficient color contrast")).toBe(
      "Element has insufficient color contrast",
    );
  });

  it("keeps a lone colon-terminated line rather than emptying the field", () => {
    expect(stripFailurePrefix("Fix any of the following:")).toBe("Fix any of the following:");
  });
});

const t = translator();

function rule(id: string, nodes: AxeRule["nodes"]): AxeRule {
  return { id, impact: "serious", help: id, description: id, tags: ["wcag2a"], nodes };
}

const contrastNode = {
  target: [".muted"],
  any: [
    {
      id: "color-contrast",
      data: {
        fgColor: "#999999",
        bgColor: "#ffffff",
        contrastRatio: 2.85,
        expectedContrastRatio: "4.5:1",
      },
    },
  ],
};

function enrichedPage() {
  const enriched = enrichViolations(
    [
      rule("color-contrast", [contrastNode]),
      rule("html-has-lang", [{ target: ["html"] }]),
      rule("image-alt", [{ target: ["img.logo"] }, { target: ["img.hero"] }]),
      rule("label", [{ target: ["#email"] }, { target: ["input.search"] }]),
    ],
    {
      "img.logo": { tag: "img", src: "/logo.png" },
      "img.hero": { tag: "img" },
      "#email": { tag: "input", id: "email" },
      "input.search": { tag: "input", placeholder: "Search" },
    },
    t,
  );
  attachFixGroups(enriched);
  return enriched;
}

describe("enrichViolations carries the fix confidence", () => {
  it("to the finding and to every fix group, for the site and the extension alike", () => {
    const byId = Object.fromEntries(enrichedPage().map((e) => [e.v.id, e.v]));

    expect(byId["color-contrast"].fixConfidence).toBe("deterministic");
    expect(byId["html-has-lang"].fixConfidence).toBe("suggested");
    expect(byId["html-has-lang"].fixCode).not.toContain('lang="en"');
    expect(byId["image-alt"].fixGroups?.map((g) => [g.code, g.confidence])).toEqual([
      ['alt="Logo"', "contextual"],
      ['alt="…"', "suggested"],
    ]);
    expect(byId["label"].fixGroups?.map((g) => [g.code, g.confidence])).toEqual([
      ['<label for="email">Email</label>', "contextual"],
      ['aria-label="Search"', "contextual"],
    ]);
  });
});

describe("planVerification", () => {
  it("sends only deterministic transformations to the verifier", () => {
    const { ops, clusters } = planVerification(enrichedPage(), 40);
    expect(ops).toEqual([
      {
        ruleId: "color-contrast",
        selector: ".muted",
        apply: expect.objectContaining({ kind: "style", prop: "color" }),
      },
    ]);
    expect(clusters.every((c) => c.confidence === "deterministic")).toBe(true);
  });

  it('never plans alt="", a guessed label or an invented lang, even with budget to spare', () => {
    const { ops } = planVerification(enrichedPage(), 40);
    expect(ops.map((o) => o.ruleId)).not.toContain("image-alt");
    expect(ops.map((o) => o.ruleId)).not.toContain("label");
    expect(ops.map((o) => o.ruleId)).not.toContain("html-has-lang");
  });

  it("plans one op per cluster and respects the op budget", () => {
    const many = enrichViolations(
      [
        rule(
          "color-contrast",
          Array.from({ length: 5 }, (_, i) => ({ ...contrastNode, target: [`.c${i}`] })),
        ),
      ],
      {},
      t,
    );
    expect(planVerification(many, 40).ops).toHaveLength(1);
    expect(planVerification(many, 0).ops).toHaveLength(0);
  });
});
