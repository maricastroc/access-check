import { describe, expect, it } from "vitest";
import { clusterFixes, isVerifiable, MAX_GROUP_SELECTORS } from "./group";
import type { FixResult } from "./remediate";

const node = (selector: string | null, result: FixResult | null) => ({
  selector,
  result,
});
const contrast = (color: string): FixResult => ({
  confidence: "deterministic",
  text: `Use ${color}`,
  code: `color: ${color};`,
  apply: { kind: "style", prop: "color", value: color },
});

describe("clusterFixes", () => {
  it("groups nodes with the same fix into a single group", () => {
    const groups = clusterFixes([
      node(".a", contrast("#111")),
      node(".b", contrast("#111")),
      node(".c", contrast("#111")),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].selectors).toEqual([".a", ".b", ".c"]);
  });

  it("separates different fixes and sorts by the largest group", () => {
    const groups = clusterFixes([
      node(".a", contrast("#111")),
      node(".b", contrast("#222")),
      node(".c", contrast("#222")),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(2); // #222
    expect(groups[0].code).toBe("color: #222;");
    expect(groups[1].count).toBe(1);
  });

  it("ignores nodes without a concrete fix", () => {
    const groups = clusterFixes([node(".a", null), node(".b", contrast("#111"))]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
  });

  it("counts everything but limits the stored selectors", () => {
    const many = Array.from({ length: MAX_GROUP_SELECTORS + 5 }, (_, i) =>
      node(`.s${i}`, contrast("#111")),
    );
    const [g] = clusterFixes(many);
    expect(g.count).toBe(MAX_GROUP_SELECTORS + 5);
    expect(g.selectors).toHaveLength(MAX_GROUP_SELECTORS);
  });

  it("uses the text as the signature when there is no code", () => {
    const textOnly: FixResult = { confidence: "suggested", text: "Darken the background instead." };
    const groups = clusterFixes([node("a", textOnly), node("b", textOnly)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
    expect(groups[0].code).toBeUndefined();
  });

  it("carries the confidence and never merges fixes that differ in confidence", () => {
    const guessed: FixResult = {
      confidence: "contextual",
      text: "Use the title",
      code: 'alt="Logo"',
      apply: { kind: "attr", name: "alt", value: "Logo" },
    };
    const hinted: FixResult = { confidence: "suggested", text: "Describe it", code: 'alt="Logo"' };
    const groups = clusterFixes([node("a", guessed), node("b", hinted), node("c", guessed)]);
    expect(groups.map((g) => [g.confidence, g.count])).toEqual([
      ["contextual", 2],
      ["suggested", 1],
    ]);
  });
});

describe("isVerifiable", () => {
  it("accepts only a deterministic fix that carries a transformation", () => {
    const [deterministic] = clusterFixes([node(".a", contrast("#111"))]);
    const [contextual] = clusterFixes([
      node(".b", {
        confidence: "contextual",
        text: "Name it",
        code: 'aria-label="Submit"',
        apply: { kind: "attr", name: "aria-label", value: "Submit" },
      }),
    ]);
    const [suggested] = clusterFixes([
      node(".c", { confidence: "suggested", text: "Set the language", code: '<html lang="…">' }),
    ]);
    expect(isVerifiable(deterministic)).toBe(true);
    expect(isVerifiable(contextual)).toBe(false);
    expect(isVerifiable(suggested)).toBe(false);
  });
});
