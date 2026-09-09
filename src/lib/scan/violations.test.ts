import { describe, expect, it } from "vitest";
import { stripFailurePrefix } from "./violations";

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
