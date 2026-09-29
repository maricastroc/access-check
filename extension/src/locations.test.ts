import { describe, expect, it } from "vitest";
import { locatable, locationsOf } from "./locations";
import type { FindingView } from "../../src/lib/report/findings";
import type { KeyboardOccurrence } from "../../src/lib/scan/keyboard";

function finding(over: Partial<FindingView>): FindingView {
  return {
    affectedSelectors: [],
    identities: {},
    occurrences: [],
    ...over,
  } as FindingView;
}

const button = {
  tag: "button",
  ref: null,
  name: "Order now",
  region: "footer",
  regionName: null,
  nth: null,
  of: null,
} as unknown as NonNullable<KeyboardOccurrence["identity"]>;

describe("every finding that names an element can be found on the page", () => {
  it("offers an axe finding's elements, once each, with their names", () => {
    const places = locationsOf(
      finding({
        affectedSelectors: [".cta", ".cta", "#promo a"],
        identities: { ".cta": button },
      }),
    );

    expect(places.map((p) => p.selector)).toEqual([".cta", "#promo a"]);
    expect(places[0].identity).toBe(button);
    expect(places[0].label).toBe("Order now");
    expect(places.every((p) => !p.keyboard && p.stop === null)).toBe(true);
    expect(places.every((p) => p.certainty === "conclusive")).toBe(true);
  });

  it("keeps a keyboard finding's own stops, reasons and certainty", () => {
    const occurrence: KeyboardOccurrence = {
      stop: 4,
      selector: "nav a",
      tag: "a",
      label: "Pricing",
      identity: null,
      html: "<a>Pricing</a>",
      rect: { x: 1, y: 2, w: 3, h: 4 },
      onScreen: true,
      reason: "Nothing changed when focus arrived.",
      certainty: "needs-review",
    };
    const [place] = locationsOf(
      finding({ occurrences: [occurrence], affectedSelectors: ["ignored"] }),
    );

    expect(place).toMatchObject({
      selector: "nav a",
      stop: 4,
      keyboard: true,
      reason: "Nothing changed when focus arrived.",
      html: "<a>Pricing</a>",
      certainty: "needs-review",
    });
  });

  it("has nothing to point at when the finding is about the document itself", () => {
    const places = locationsOf(
      finding({ affectedSelectors: ["html", 'meta[name="viewport"]', "head > title"] }),
    );
    expect(places).toEqual([]);
  });

  it("tells a document-level target from an element", () => {
    expect(locatable("html")).toBe(false);
    expect(locatable("  ")).toBe(false);
    expect(locatable('meta[name="viewport"]')).toBe(false);
    expect(locatable("html > head > title")).toBe(false);
    expect(locatable("html > body > main > div")).toBe(true);
    expect(locatable("header > a")).toBe(true);
    expect(locatable("div.metadata")).toBe(true);
    expect(locatable("#main .title")).toBe(true);
  });
});
