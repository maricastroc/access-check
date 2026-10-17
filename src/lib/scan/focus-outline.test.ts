import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrowserContext } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { injectDomEngine } from "./scan";
import { openIsolatedWorld } from "./world";
import { collectKeyboard, type KeyboardFinding } from "./keyboard";
import { translator } from "../i18n/t";

const t = translator();

const VIEWPORT = { width: 1200, height: 800 };

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Outlines removed by rules</title>
    <link rel="stylesheet" href="https://shop.test/css/site.css" />
    <link rel="stylesheet" href="https://cdn.test/remote.css" />
    <style>
      body { margin: 0; padding: 16px; font: 16px system-ui; color: #1d1b16; background: #fffdf7; }
      nav { background: #14342b; padding: 8px; }
      nav a { color: #f4efe2; }
      nav a.plain { outline:none }
      .ghost { outline: none }
      button.ghost.plain { outline:none }
      button { font: inherit; padding: 8px 14px; border: 1px solid #14342b; background: transparent; color: #14342b; }
    </style>
  </head>
  <body>
    <nav><a href="/catalogue" id="catalogue">Catalogue</a> <a href="/offers" class="plain" id="offers">Offers</a></nav>
    <main>
      <button class="ghost plain" id="gift">Gift a membership</button>
      <button class="btn" id="buy">Buy</button>
      <a href="/remote" class="remote" id="remote">Remote</a>
    </main>
  </body>
</html>`;

let context: BrowserContext;
let finding: KeyboardFinding | undefined;

beforeAll(async () => {
  const browser = await acquireBrowser();
  context = await browser.newContext({ viewport: VIEWPORT });
  await context.route("https://shop.test/**", (route) =>
    route.request().url().endsWith(".css")
      ? route.fulfill({
          contentType: "text/css",
          body: ".btn { background: #14342b; color: #fffdf7; } .btn:focus { outline: 0; box-shadow: none; }",
        })
      : route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE }),
  );
  await context.route("https://cdn.test/**", (route) =>
    route.fulfill({ contentType: "text/css", body: ".remote { outline: none }" }),
  );
  const page = await context.newPage();
  await page.goto("https://shop.test/", { waitUntil: "load" });
  const world = await openIsolatedWorld(page);
  await injectDomEngine(world);
  const report = await collectKeyboard(page, world, VIEWPORT, t);
  finding = report.findings.find((f) => f.id === "focus-not-visible");
}, 90_000);

afterAll(async () => {
  await context?.close();
  await closeSharedBrowser();
});

const fixFor = (selector: string) => finding?.fixes?.find((f) => f.selectors.includes(selector));

describe("a missing focus indicator caused by a rule on the page", () => {
  it("names the most specific rule that removes the outline and replaces it", () => {
    expect(fixFor("#gift")).toMatchObject({
      removed: "button.ghost.plain { outline: none }",
      code: "button.ghost.plain:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}",
      note: "Rule found in the <style> on this page.",
    });
  });

  it("keeps each rule apart", () => {
    expect(fixFor("#offers")?.removed).toBe("nav a.plain { outline: none }");
    expect(fixFor("#offers")?.selectors).toEqual(["#offers"]);
  });

  it("moves a :focus rule to :focus-visible, in the colour of the element's fill, and names its file", () => {
    expect(fixFor("#buy")).toMatchObject({
      removed: ".btn:focus { outline: 0px }",
      code: ".btn:focus-visible {\n  outline: 2px solid #14342b;\n  outline-offset: 2px;\n}",
      note: "Rule found in site.css.",
    });
  });

  it("falls back to the general advice when the rule is in a stylesheet it cannot read", () => {
    const fallback = fixFor("#remote");
    expect(fallback?.removed).toBeUndefined();
    expect(fallback?.note).toContain("at least as specific");
    expect(fallback?.note).toContain("1 stylesheet from another domain couldn't be read");
  });
});
