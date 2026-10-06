import { describe, expect, it } from "vitest";
import {
  appliesToWholePage,
  findingsAtStops,
  firstAtEachStop,
  insideShadowRoot,
  locatable,
  occurrencesOf,
  occurrenceTag,
  stepOccurrence,
  stopCandidates,
  unlistedOccurrences,
  unplaced,
} from "./occurrences";
import type { FindingView } from "./findings";
import type { KeyboardOccurrence } from "@/lib/scan/keyboard";
import type { ScanMarker } from "@/lib/scan/types";

function finding(over: Partial<FindingView>): FindingView {
  return {
    affectedSelectors: [],
    identities: {},
    occurrences: [],
    markers: [],
    elements: 0,
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

const marker = (n: number, over: Partial<ScanMarker> = {}): ScanMarker => ({
  n,
  captureId: "viewport",
  severity: "serious",
  label: "Contrast",
  left: 1,
  top: 1,
  width: 1,
  height: 1,
  ...over,
});

describe("every finding that names an element can be found on the page", () => {
  it("offers an axe finding's elements, once each, with their names", () => {
    const places = occurrencesOf(
      finding({
        affectedSelectors: [".cta", ".cta", "#promo a"],
        identities: { ".cta": button },
      }),
    );

    expect(places.map((p) => p.selector)).toEqual([".cta", "#promo a"]);
    expect(places.map((p) => p.index)).toEqual([0, 1]);
    expect(places[0].identity).toBe(button);
    expect(places[0].name).toBe("Order now");
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
    const [place] = occurrencesOf(
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
    const places = occurrencesOf(
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

  it("says a finding applies to the whole page only when the page itself is what fails", () => {
    const wcag = (ruleId: string, affectedSelectors: string[]) =>
      finding({ kind: "wcag", ruleId, affectedSelectors });
    expect(appliesToWholePage(wcag("html-has-lang", ["html"]))).toBe(true);
    expect(appliesToWholePage(wcag("document-title", ["html"]))).toBe(true);
    expect(appliesToWholePage(wcag("meta-viewport", ['meta[name="viewport"]']))).toBe(true);
    expect(appliesToWholePage(wcag("bypass", ["html"]))).toBe(true);
    expect(appliesToWholePage(wcag("meta-refresh", ['meta[http-equiv="refresh"]']))).toBe(true);
    expect(appliesToWholePage(wcag("region", ["body > p"]))).toBe(false);
    expect(appliesToWholePage(wcag("image-alt", ["img.logo"]))).toBe(false);
    expect(appliesToWholePage(wcag("image-alt", []))).toBe(false);
  });

  it("tells a finding inside a shadow root from one about the whole page", () => {
    const wcag = (ruleId: string, affectedSelectors: string[], elements: number) =>
      finding({ kind: "wcag", ruleId, affectedSelectors, elements });
    expect(unplaced(wcag("button-name", [], 1))).toBe("shadow-root");
    expect(unplaced(wcag("region", [], 3))).toBe("shadow-root");
    expect(unplaced(wcag("bypass", ["html"], 1))).toBe("whole-page");
    expect(unplaced(wcag("button-name", ["#buy"], 1))).toBe(null);
    expect(appliesToWholePage(wcag("button-name", [], 1))).toBe(false);
    expect(insideShadowRoot(wcag("button-name", [], 1))).toBe(true);
    expect(insideShadowRoot(wcag("bypass", ["html"], 1))).toBe(false);
  });
});

describe("each occurrence knows where the capture drew it", () => {
  it("ties a marker to the element it was measured on", () => {
    const places = occurrencesOf(
      finding({
        affectedSelectors: [".a", ".b", ".c"],
        markers: [marker(1, { selector: ".a" }), marker(4, { selector: ".c" })],
      }),
    );

    expect(places.map((p) => p.markers.map((m) => m.n))).toEqual([[1], [], [4]]);
  });

  it("puts the first screenshot ahead of a contextual capture", () => {
    const [place] = occurrencesOf(
      finding({
        affectedSelectors: [".a"],
        markers: [
          marker(7, { selector: ".a", captureId: "r1" }),
          marker(2, { selector: ".a", captureId: "viewport" }),
        ],
      }),
    );

    expect(place.markers.map((m) => m.captureId)).toEqual(["viewport", "r1"]);
  });

  it("gives an older reading's untied markers to the first occurrence only", () => {
    const places = occurrencesOf(
      finding({ affectedSelectors: [".a", ".b"], markers: [marker(1), marker(2)] }),
    );

    expect(places[0].markers).toHaveLength(2);
    expect(places[1].markers).toEqual([]);
  });
});

describe("naming and stepping through occurrences", () => {
  it("writes a finding's number alone, and an occurrence as number·index", () => {
    expect(occurrenceTag(3, 0, 1)).toBe("3");
    expect(occurrenceTag(3, 0, 5)).toBe("3·1");
    expect(occurrenceTag(3, 4, 5)).toBe("3·5");
  });

  it("wraps around at either end", () => {
    expect(stepOccurrence(4, 5, 1)).toBe(0);
    expect(stepOccurrence(0, 5, -1)).toBe(4);
    expect(stepOccurrence(0, 0, 1)).toBe(0);
  });

  it("says how many affected elements the reading could not list one by one", () => {
    expect(unlistedOccurrences(finding({ elements: 40 }), 8)).toBe(32);
    expect(unlistedOccurrences(finding({ elements: 3 }), 3)).toBe(0);
  });
});

const atStop = (stop: number | null, selector: string): KeyboardOccurrence => ({
  stop,
  selector,
  tag: "a",
  label: selector,
  html: null,
  rect: null,
  onScreen: true,
  reason: "",
  certainty: "conclusive",
});

describe("a finding sits at a focus stop when its element is that stop", () => {
  const unnamed = finding({ id: "wcag:button-name", n: 1, affectedSelectors: [".cart"] });
  const contrast = finding({
    id: "wcag:color-contrast",
    n: 4,
    affectedSelectors: [".muted", ".cart"],
  });
  const noFocus = finding({
    id: "keyboard:focus-not-visible",
    n: 7,
    kind: "keyboard",
    occurrences: [atStop(2, "nav > a:nth-of-type(2)"), atStop(5, "header > span > button")],
  });

  it("takes a keyboard finding's stop from the walk itself", () => {
    expect(findingsAtStops([noFocus]).map((r) => [r.stop, r.tag])).toEqual([
      [2, "7·1"],
      [5, "7·2"],
    ]);
  });

  it("places an axe finding through the stops the walk matched it to", () => {
    const found = findingsAtStops([unnamed, contrast], { ".cart": 5 });

    expect(found.map((r) => [r.stop, r.findingId, r.tag])).toEqual([
      [5, "wcag:button-name", "1"],
      [5, "wcag:color-contrast", "4·2"],
    ]);
  });

  it("leaves out an element the walk never reached", () => {
    expect(findingsAtStops([contrast], { ".cart": 5 }).map((r) => r.index)).toEqual([1]);
    expect(findingsAtStops([unnamed])).toEqual([]);
  });

  it("orders the findings at each stop most severe first, and keeps one per stop at rest", () => {
    const found = findingsAtStops([noFocus, contrast, unnamed], { ".cart": 5 });
    const first = firstAtEachStop(found);

    expect(found.filter((r) => r.stop === 5).map((r) => r.n)).toEqual([1, 4, 7]);
    expect([...first.keys()]).toEqual([2, 5]);
    expect(first.get(5)?.findingId).toBe("wcag:button-name");
    expect(first.get(2)?.findingId).toBe("keyboard:focus-not-visible");
  });

  it("asks the page about each element once, and never about a stop it already knows", () => {
    expect(stopCandidates([unnamed, contrast, noFocus])).toEqual([".cart", ".muted"]);
  });
});
