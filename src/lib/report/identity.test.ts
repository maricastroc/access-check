import { describe, expect, it } from "vitest";
import type { ElementIdentity } from "@/lib/scan/dom/identity";
import { describeElement, elementLine } from "./identity";
import { translator } from "@/lib/i18n/t";

const t = translator("en");

function identity(over: Partial<ElementIdentity> = {}): ElementIdentity {
  return {
    tag: "a",
    ref: null,
    name: null,
    region: null,
    regionName: null,
    nth: null,
    of: null,
    ...over,
  };
}

describe("naming an element for a person", () => {
  it("leads with the tag and the one attribute worth grepping", () => {
    const view = describeElement(
      "div > div > a:nth-of-type(2)",
      identity({ ref: "#skip-link" }),
      t,
    );
    expect(view.label).toBe("a#skip-link");
  });

  it("quotes the accessible name so it can be searched in the source", () => {
    const view = describeElement(
      "x",
      identity({ ref: '[href*="pricing"]', name: "See pricing" }),
      t,
    );
    expect(view.label).toBe('a[href*="pricing"] “See pricing”');
  });

  it("numbers an element only when its identity is shared", () => {
    expect(describeElement("x", identity({ name: "Read more", nth: 2, of: 3 }), t).label).toBe(
      "a “Read more” 2 of 3",
    );
    expect(describeElement("x", identity({ name: "Read more", nth: 1, of: 1 }), t).label).toBe(
      "a “Read more”",
    );
  });

  it("says where the element sits, naming the region when it has a name", () => {
    expect(describeElement("x", identity({ region: "<nav>" }), t).context).toBe("in <nav>");
    expect(
      describeElement("x", identity({ region: "<section>", regionName: "Pricing" }), t).context,
    ).toBe("in <section> “Pricing”");
    expect(describeElement("x", identity(), t).context).toBeNull();
  });

  it("keeps the technical selector beside the readable name, never instead of it", () => {
    const locator = ".sc-fznKkj.hLSTQF > div:nth-of-type(2) > a";
    const view = describeElement(locator, identity({ name: "Get started" }), t);
    expect(view.locator).toBe(locator);
    expect(view.label).not.toContain("sc-fznKkj");
  });

  it("falls back to the raw selector for a scan taken before identities existed", () => {
    const view = describeElement(".legacy > a", undefined, t);
    expect(view.label).toBe(".legacy > a");
    expect(view.context).toBeNull();
    expect(elementLine(".legacy > a", undefined, t)).toBe(".legacy > a");
  });

  it("joins name and place on one line for plain-text exports", () => {
    expect(elementLine("x", identity({ ref: "#submit", region: "<form>" }), t)).toBe(
      "a#submit · in <form>",
    );
  });

  it("reads the same sentence in Portuguese", () => {
    const pt = translator("pt-BR");
    const view = describeElement(
      "x",
      identity({ name: "Saiba mais", nth: 2, of: 3, region: "<nav>" }),
      pt,
    );
    expect(view.label).toBe("a “Saiba mais” 2 de 3");
    expect(view.context).toBe("em <nav>");
  });
});
