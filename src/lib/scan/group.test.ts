import { describe, expect, it } from "vitest";
import { clusterFixes, MAX_GROUP_SELECTORS } from "./group";
import type { FixResult } from "./remediate";

const node = (selector: string | null, result: FixResult | null) => ({
  selector,
  result,
});
const contrast = (color: string): FixResult => ({
  text: `Use ${color}`,
  code: `color: ${color};`,
  apply: { kind: "style", prop: "color", value: color },
});

describe("clusterFixes", () => {
  it("junta nós com o mesmo conserto num grupo só", () => {
    const groups = clusterFixes([
      node(".a", contrast("#111")),
      node(".b", contrast("#111")),
      node(".c", contrast("#111")),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].selectors).toEqual([".a", ".b", ".c"]);
  });

  it("separa consertos diferentes e ordena pelo maior grupo", () => {
    const groups = clusterFixes([
      node(".a", contrast("#111")),
      node(".b", contrast("#222")),
      node(".c", contrast("#222")),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(2); // #222 primeiro (cobre mais)
    expect(groups[0].code).toBe("color: #222;");
    expect(groups[1].count).toBe(1);
  });

  it("ignora nós sem conserto concreto", () => {
    const groups = clusterFixes([node(".a", null), node(".b", contrast("#111"))]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
  });

  it("conta tudo mas limita os seletores guardados", () => {
    const many = Array.from({ length: MAX_GROUP_SELECTORS + 5 }, (_, i) =>
      node(`.s${i}`, contrast("#111")),
    );
    const [g] = clusterFixes(many);
    expect(g.count).toBe(MAX_GROUP_SELECTORS + 5);
    expect(g.selectors).toHaveLength(MAX_GROUP_SELECTORS);
  });

  it("usa o texto como assinatura quando não há code", () => {
    const textOnly: FixResult = { text: "Darken the background instead." };
    const groups = clusterFixes([node("a", textOnly), node("b", textOnly)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].code).toBeUndefined();
  });
});
