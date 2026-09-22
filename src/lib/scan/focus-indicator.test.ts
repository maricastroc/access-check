import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { injectDomEngine } from "./scan";
import {
  buildKeyboardReport,
  collectKeyboard,
  focusIndicatorOf,
  visiblyChanged,
  type KeyboardReport,
} from "./keyboard";
import type { FocusScopePart, FocusStyle } from "./dom/focus";
import { ownRuleViolations } from "./scored";
import { chargeable } from "./evidence";
import { translator } from "../i18n/t";

const t = translator();

const VIEWPORT = { width: 1200, height: 800 };

const COMPONENTS = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Focus indicators drawn by components</title>
    <style>
      body { margin: 0; padding: 16px; font: 16px system-ui; color: #111827; background: #ffffff; }
      :focus { outline: none; }
      .field { display: inline-block; border-radius: 6px; }
      .field:focus-within { box-shadow: 0 0 0 2px rgb(0, 85, 213); }
      .field input { border: 0; padding: 4px; }
      .check { display: inline-flex; align-items: center; gap: 6px; }
      .check input { position: absolute; opacity: 0; }
      .check .box { width: 16px; height: 16px; border: 1px solid #111827; }
      .check input:focus-visible + .box { box-shadow: 0 0 0 3px rgb(0, 85, 213); }
      .pseudo { position: relative; }
      .pseudo:focus-visible::after {
        content: ""; position: absolute; inset: -3px; border: 2px solid rgb(0, 85, 213);
      }
      .card { display: block; padding: 8px; border: 1px solid #d1d5db; }
      .card:focus-within { border-color: rgb(0, 85, 213); }
      .bare { color: #111827; }
    </style>
  </head>
  <body>
    <main>
      <h1>Focus indicators</h1>
      <span class="field"><input id="email" placeholder="Email" aria-label="Email" /></span>
      <label class="check"><input type="checkbox" id="agree" /><span class="box"></span>Agree</label>
      <a href="/pseudo" class="pseudo" id="pseudo">Drawn with ::after</a>
      <div class="card"><a href="/one" id="card-one">One</a> <a href="/two" id="card-two">Two</a></div>
      <span class="wrap"><a href="/bare" class="bare" id="bare">Nothing changes</a></span>
    </main>
  </body>
</html>`;

let context: BrowserContext;
let page: Page;
let report: KeyboardReport;

beforeAll(async () => {
  const browser = await acquireBrowser();
  context = await browser.newContext({ viewport: VIEWPORT });
  page = await context.newPage();
  await page.setContent(COMPONENTS, { waitUntil: "domcontentloaded" });
  await injectDomEngine(page);
  report = await collectKeyboard(page, VIEWPORT, t);
}, 90_000);

afterAll(async () => {
  await context?.close();
  await closeSharedBrowser();
});

const stopFor = (selector: string) => report.focusPath.find((s) => s.selector === selector);
const findingFor = (id: string) => report.findings.find((f) => f.id === id);

describe("a focus indicator drawn by the component around the control", () => {
  it("counts a ring on the wrapper of a field", () => {
    expect(stopFor("#email")).toMatchObject({ focusVisible: true, focusIndicator: "component" });
  });

  it("counts a ring on the box drawn beside a hidden checkbox", () => {
    expect(stopFor("#agree")).toMatchObject({ focusVisible: true, focusIndicator: "component" });
  });

  it("counts a ring drawn by the element's own ::after", () => {
    expect(stopFor("#pseudo")).toMatchObject({ focusVisible: true, focusIndicator: "component" });
  });

  it("does not call any of them a missing indicator", () => {
    const failing = findingFor("focus-not-visible")?.selectors ?? [];
    expect(failing).not.toContain("#email");
    expect(failing).not.toContain("#agree");
    expect(failing).not.toContain("#pseudo");
  });
});

describe("a change only on a container shared with other controls", () => {
  it("is neither a pass nor a failure: it asks for a human check", () => {
    expect(stopFor("#card-one")?.focusIndicator).toBe("shared");
    const unclear = findingFor("focus-indicator-unclear");
    expect(unclear?.evidence).toBe("heuristic");
    expect(unclear?.selectors).toEqual(expect.arrayContaining(["#card-one", "#card-two"]));
  });

  it("names the container and how many other controls it holds", () => {
    const occurrence = findingFor("focus-indicator-unclear")?.occurrences.find(
      (o) => o.selector === "#card-one",
    );
    expect(occurrence?.certainty).toBe("needs-review");
    expect(occurrence?.reason).toContain("div");
    expect(occurrence?.reason).toContain("1 other control");
  });

  it("costs nothing in the score", () => {
    const charged = chargeable(ownRuleViolations({ keyboard: report, audits: undefined }));
    expect(charged.map((v) => v.id)).not.toContain("focus-indicator-unclear");
  });
});

describe("a stop this build cannot read into", () => {
  it("does not call a shadow host's missing indicator a failure", () => {
    const report = buildKeyboardReport(
      {
        focusPath: [
          {
            n: 1,
            selector: "mdn-placement-top",
            label: "mdn-placement-top",
            tag: "mdn-placement-top",
            focusVisible: true,
            focusIndicator: "opaque",
            left: 0,
            top: 0,
            width: 10,
            height: 5,
          },
        ],
        startedAtTop: true,
        stoppedBy: "cycle",
        trapSelector: null,
        positiveTabindex: [],
        unreachable: [],
        totalInteractive: 1,
        reachableInteractive: 1,
        truncated: false,
        cycleComplete: true,
      },
      t,
    );

    expect(report.findings.map((f) => f.id)).toEqual(["focus-indicator-unclear"]);
    expect(report.findings[0].occurrences[0].reason).toContain("shadow root");
  });
});

describe("a control where nothing changes at all", () => {
  it("is still a measured failure", () => {
    expect(stopFor("#bare")).toMatchObject({ focusVisible: false, focusIndicator: "none" });
    const failing = findingFor("focus-not-visible");
    expect(failing?.evidence).toBe("measured");
    expect(failing?.selectors).toEqual(["#bare"]);
  });

  it("says the component around it was checked too", () => {
    const occurrence = findingFor("focus-not-visible")?.occurrences[0];
    expect(occurrence?.reason).toContain("wrapper");
  });
});

const REST: FocusStyle = {
  outlineStyle: "none",
  outlineWidth: "0px",
  outlineColor: "rgb(17, 24, 39)",
  boxShadow: "none",
  borderTopWidth: "0px",
  borderTopColor: "rgb(17, 24, 39)",
  backgroundColor: "rgba(0, 0, 0, 0)",
};

const part = (key: string, style: FocusStyle, shared = false): FocusScopePart => ({
  key,
  shared,
  name: shared ? "div.card" : "",
  sharedWith: shared ? 2 : 0,
  style,
});

describe("focusIndicatorOf", () => {
  it("prefers the element's own change", () => {
    const own = { ...REST, outlineStyle: "solid", outlineWidth: "2px" };
    expect(focusIndicatorOf(own, [], { ...REST, scope: [] }).indicator).toBe("own");
  });

  it("reads a change on a part of the component", () => {
    const ring = { ...REST, boxShadow: "rgb(0, 85, 213) 0px 0px 0px 2px" };
    const reading = focusIndicatorOf(REST, [part("up1", ring)], {
      ...REST,
      scope: [part("up1", REST)],
    });
    expect(reading.indicator).toBe("component");
  });

  it("reports a change on a shared container as shared", () => {
    const ring = { ...REST, borderTopColor: "rgb(0, 85, 213)" };
    const reading = focusIndicatorOf(REST, [part("up1", ring, true)], {
      ...REST,
      scope: [part("up1", REST, true)],
    });
    expect(reading).toEqual({ indicator: "shared", on: "div.card", sharedWith: 2 });
  });

  it("finds nothing when nothing changed anywhere", () => {
    const reading = focusIndicatorOf(REST, [part("up1", REST)], {
      ...REST,
      scope: [part("up1", REST)],
    });
    expect(reading.indicator).toBe("none");
  });

  it("does not guess from a component it could only read on one side", () => {
    const ring = { ...REST, boxShadow: "rgb(0, 85, 213) 0px 0px 0px 2px" };
    expect(focusIndicatorOf(REST, [part("up1", ring)], REST).indicator).toBe("none");
  });
});

describe("visiblyChanged", () => {
  it("ignores a pseudo-element that is not drawn in either state", () => {
    const hidden = { ...REST, content: "none" };
    expect(visiblyChanged({ ...hidden, color: "red" }, hidden)).toBe(false);
  });

  it("sees a pseudo-element appear", () => {
    expect(visiblyChanged({ ...REST, content: '""' }, { ...REST, content: "none" })).toBe(true);
  });

  it("does not treat an outline colour as a change while no outline is drawn", () => {
    expect(visiblyChanged({ ...REST, outlineColor: "rgb(0, 85, 213)" }, REST)).toBe(false);
  });

  it("sees an underline appear", () => {
    expect(
      visiblyChanged(
        { ...REST, textDecorationLine: "underline" },
        { ...REST, textDecorationLine: "none" },
      ),
    ).toBe(true);
  });
});
