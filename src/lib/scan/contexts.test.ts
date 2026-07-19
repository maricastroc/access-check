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
  it("maps impact→severity, tags→criterion and truncates selectors", () => {
    const issue = toContextIssue(rule());
    expect(issue.severity).toBe("serious");
    expect(issue.criterion).toBe("WCAG 2.5.8 · Target Size (Minimum)");
    expect(issue.nodes).toBe(3);
    expect(issue.selectors).toHaveLength(5);
  });

  it("falls back to 'minor' when impact is null and to the id when there is no criterion", () => {
    const issue = toContextIssue(rule({ impact: null, tags: ["cat.foo"], id: "custom" }));
    expect(issue.severity).toBe("minor");
    expect(issue.criterion).toBe("custom");
  });
});

describe("newIssues", () => {
  it("keeps only the rules that are not in the desktop baseline", () => {
    const baseline = new Set(["color-contrast", "image-alt"]);
    const rules = [
      rule({ id: "color-contrast" }),
      rule({ id: "target-size" }),
      rule({ id: "meta-viewport" }),
    ];
    const out = newIssues(baseline, rules);
    expect(out.map((i) => i.id)).toEqual(["target-size", "meta-viewport"]);
  });

  it("empty baseline keeps everything; no rules keeps nothing", () => {
    expect(newIssues(new Set(), [rule({ id: "a" }), rule({ id: "b" })])).toHaveLength(2);
    expect(newIssues(new Set(["a"]), [])).toHaveLength(0);
  });
});
