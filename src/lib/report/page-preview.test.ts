import { describe, expect, it } from "vitest";
import type { FindingView } from "./findings";
import { pagePreviewOf } from "./page-preview";

function finding(over: Partial<FindingView>): FindingView {
  return {
    id: "wcag:color-contrast",
    n: 4,
    kind: "wcag",
    evidence: "measured",
    isWcag: true,
    severity: "serious",
    passLabel: null,
    title: "Text below the minimum contrast",
    criterionSc: "1.4.3",
    criterionName: null,
    elements: 2,
    ruleId: "color-contrast",
    desc: "",
    impact: "",
    fixText: "",
    fixCode: null,
    fixGroups: null,
    guidance: null,
    measurement: null,
    preview: null,
    verdict: {
      kind: "unverifiable",
      totalElements: 2,
      sampledCleared: 0,
      sampledFailed: 0,
      reaudited: 0,
      fullyCovered: false,
      shared: false,
    },
    affectedSelectors: [],
    selectors: [],
    identities: {},
    markers: [],
    located: true,
    noMarkerReason: "",
    contexts: [],
    occurrences: [],
    ...over,
  };
}

const contrastGroup = (hex: string, selectors: string[]) => ({
  text: `Replace text color #a09a8a with ${hex} → 4.61:1 against #fffdf7 (was 2.75:1, needs 4.5:1).`,
  code: `color: ${hex};`,
  count: selectors.length,
  selectors,
  verification: "verified" as const,
});

describe("what a fix preview puts on the page", () => {
  it("gives every element of a contrast finding the color its own fix asks for", () => {
    const plan = pagePreviewOf(
      finding({
        fixGroups: [
          contrastGroup("#6b6559", ["main > p.muted", "footer"]),
          contrastGroup("#2f6b57", ["a.hero"]),
        ],
      }),
    );

    expect(plan).toEqual({
      kind: "contrast",
      css: [
        "main > p.muted { color: #6b6559 !important; }",
        "footer { color: #6b6559 !important; }",
        "a.hero { color: #2f6b57 !important; }",
      ].join("\n"),
      selectors: ["main > p.muted", "footer", "a.hero"],
    });
  });

  it("changes the background when that is the fix", () => {
    const plan = pagePreviewOf(
      finding({
        fixGroups: [
          {
            ...contrastGroup("#123456", ["button.buy"]),
            text: "Set the background to #123456 → 5.1:1 (was 3.2:1, needs 4.5:1).",
            code: "background-color: #123456;",
          },
        ],
      }),
    );

    expect(plan?.css).toBe("button.buy { background-color: #123456 !important; }");
  });

  it("previews the focus outline exactly as the Change step writes it", () => {
    const code =
      "nav a.plain:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}";
    const plan = pagePreviewOf(
      finding({
        id: "keyboard:focus-not-visible",
        kind: "keyboard",
        ruleId: "focus-not-visible",
        fixGroups: [
          {
            text: "",
            code,
            count: 2,
            selectors: ["nav > a:nth-child(2)", "nav > a:nth-child(3)"],
            verification: "unchecked",
          },
          { text: "", count: 1, selectors: ["button.ghost"], verification: "unchecked" },
        ],
      }),
    );

    expect(plan).toEqual({
      kind: "focus",
      css: code,
      selectors: ["nav > a:nth-child(2)", "nav > a:nth-child(3)"],
    });
  });

  it("offers nothing where the result is not calculated", () => {
    expect(pagePreviewOf(finding({ id: "wcag:link-name", ruleId: "link-name" }))).toBeNull();
    expect(
      pagePreviewOf(
        finding({
          fixGroups: [
            { ...contrastGroup("#000000", ["p"]), code: undefined, text: "Check it by hand." },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      pagePreviewOf(
        finding({
          id: "keyboard:focus-not-visible",
          kind: "keyboard",
          ruleId: "focus-not-visible",
          fixGroups: [{ text: "", count: 1, selectors: ["a"], verification: "unchecked" }],
        }),
      ),
    ).toBeNull();
  });
});
