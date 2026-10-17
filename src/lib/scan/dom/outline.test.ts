import { describe, expect, it } from "vitest";
import { specificityOf, splitSelectorList } from "./outline";

describe("specificity of the rule that removes an outline", () => {
  it.each([
    ["nav a.plain", [0, 1, 2]],
    ["button.ghost.plain", [0, 2, 1]],
    [":focus", [0, 1, 0]],
    ["*:focus", [0, 1, 0]],
    ["#main .btn:focus", [1, 2, 0]],
    [":where(.a) b", [0, 0, 1]],
    ["a:not(.x)", [0, 1, 1]],
    ['a[href*=".pdf"]', [0, 1, 1]],
    ["li::before", [0, 0, 2]],
  ])("%s", (selector, expected) => {
    expect(specificityOf(selector)).toEqual(expected);
  });
});

describe("a selector list", () => {
  it("splits on top-level commas only", () => {
    expect(splitSelectorList("a, :is(b, c), d[x=',']")).toEqual(["a", ":is(b, c)", "d[x=',']"]);
  });
});
