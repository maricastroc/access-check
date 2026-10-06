import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "../browser";
import { injectDomEngine } from "../scan";
import { openIsolatedWorld, type IsolatedWorld } from "../world";
import { buildMarkers, type MarkerTarget } from "../markers";

const VIEWPORT = { width: 1200, height: 800 };

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>What the screenshot shows</title>
    <style>
      body { margin: 0; font: 16px system-ui; color: #111827; background: #ffffff; }
      .stack { position: relative; width: 600px; height: 200px; }
      .card { position: absolute; inset: 0; background: #f3f4f6; padding: 16px; }
      .card.off { opacity: 0; }
      .rail { width: 400px; height: 80px; overflow: hidden; position: relative; }
      .track { display: flex; width: 1200px; transform: translateX(0); }
      .slide { width: 400px; flex: none; }
      .under { position: relative; width: 300px; height: 60px; }
      .cover { position: absolute; inset: 0; background: #111827; color: #fff; }
      .ghost { pointer-events: none; }
    </style>
  </head>
  <body>
    <main>
      <p id="plain">Plain text anyone can see</p>

      <div class="stack">
        <div class="card off"><span id="faded">save 25%</span></div>
        <div class="card"><span id="front">Connected accounts</span></div>
      </div>

      <div class="rail">
        <div class="track">
          <div class="slide"><span id="in-slide">First slide</span></div>
          <div class="slide"><span id="out-slide">Third slide</span></div>
        </div>
      </div>

      <div class="under">
        <span id="covered">Under the banner</span>
        <div class="cover">Banner on top</div>
      </div>

      <button type="button"><span id="label">Label inside a button</span></button>
      <p class="ghost" id="ghost">Text that ignores the pointer</p>
      <p style="visibility: hidden" id="invisible">Hidden by visibility</p>
    </main>
  </body>
</html>`;

let context: BrowserContext;
let page: Page;
let world: IsolatedWorld;

beforeAll(async () => {
  const browser = await acquireBrowser();
  context = await browser.newContext({ viewport: VIEWPORT });
  page = await context.newPage();
  await page.setContent(PAGE, { waitUntil: "domcontentloaded" });
  world = await openIsolatedWorld(page);
  await injectDomEngine(world);
}, 90_000);

afterAll(async () => {
  await context?.close();
  await closeSharedBrowser();
});

const seen = async (ids: string[]) => {
  const rects = await world.evaluate(
    (selectors) => window.__accessCheckDom!.collectRects(selectors),
    ids.map((id) => `#${id}`),
  );
  return Object.fromEntries(ids.map((id, i) => [id, rects[i]?.seen]));
};

describe("whether an element shows in the screenshot being taken", () => {
  it("sees what a reader would see", async () => {
    expect(await seen(["plain", "front", "in-slide", "label", "ghost"])).toEqual({
      plain: true,
      front: true,
      "in-slide": true,
      label: true,
      ghost: true,
    });
  });

  it("does not see an element that keeps its box while it is out of sight", async () => {
    expect(await seen(["faded", "out-slide", "covered", "invisible"])).toEqual({
      faded: false,
      "out-slide": false,
      covered: false,
      invisible: false,
    });
  });

  it("draws no marker over the card that stands in front of a faded one", async () => {
    const target = (id: string): MarkerTarget => ({
      selector: `#${id}`,
      severity: "serious",
      label: id,
    });
    const targets = [target("faded"), target("front")];
    const rects = await world.evaluate(
      (selectors) => window.__accessCheckDom!.collectRects(selectors),
      targets.map((t) => t.selector),
    );

    const markers = buildMarkers(targets, rects, VIEWPORT);

    expect(markers.map((m) => m.label)).toEqual(["front"]);
  });
});
