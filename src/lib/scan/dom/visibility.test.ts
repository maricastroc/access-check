import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BrowserContext, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "../browser";
import { injectDomEngine } from "../scan";
import { collectKeyboard } from "../keyboard";
import { analyzeTargetSize, INTERACTIVE } from "../target-size";
import { analyzeLiveRegions } from "../live-regions";
import { chargeable } from "../evidence";
import { translator } from "../../i18n/t";
import type { RawTargetSize } from "../target-size";

const t = translator();

const VIEWPORT = { width: 1200, height: 800 };

const COLLAPSED = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Collapsed content</title>
    <style>
      body { margin: 0; font: 16px system-ui; color: #111827; background: #ffffff; }
      .tiny a { display: inline-block; width: 12px; height: 12px; margin: 1px; }
      .languages { visibility: hidden; max-height: 0; overflow: hidden; }
      .languages.open { visibility: visible; max-height: none; }
      .accordion { height: 0; overflow: hidden; }
    </style>
  </head>
  <body>
    <main>
      <h1>Collapsed content</h1>
      <a href="/first" id="first">First</a>
      <button type="button" id="toggle">Read in your language</button>
      <div class="languages tiny" id="languages">
        <a href="/ar">ar</a><a href="/de">de</a><a href="/es">es</a><a href="/fr">fr</a>
      </div>
      <div hidden id="hidden-attr"><a href="/hidden">Hidden by attribute</a></div>
      <div style="display: none"><button type="button" id="gone">Not rendered</button></div>
      <details><summary>More</summary><a href="/inside-details" id="in-details">In details</a></details>
      <div class="accordion tiny" id="accordion"><a href="/c1">c1</a><a href="/c2">c2</a></div>
      <a href="/last" id="last">Last</a>
    </main>
  </body>
</html>`;

const LIVE = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Live regions</title></head>
  <body>
    <main>
      <h1>Live regions</h1>
      <div role="alert" hidden id="thanks">Thank you for your feedback</div>
      <div style="display: none"><p role="status" id="inside-hidden">Saved</p></div>
      <div aria-live="polite" aria-hidden="true" id="silenced">3 items in your basket</div>
      <div aria-live="polite" aria-hidden="true" id="silenced-empty"></div>
      <p role="status" id="visible">Ready</p>
    </main>
  </body>
</html>`;

let context: BrowserContext;
let page: Page;

async function load(html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await injectDomEngine(page);
}

beforeAll(async () => {
  const browser = await acquireBrowser();
  context = await browser.newContext({ viewport: VIEWPORT });
  page = await context.newPage();
}, 90_000);

afterAll(async () => {
  await context?.close();
  await closeSharedBrowser();
});

describe("which controls the walk expects to reach", () => {
  beforeAll(() => load(COLLAPSED));

  const candidates = async () =>
    (await page.evaluate(() => window.__accessCheckDom!.readFocusReach())).unreachable;

  it("leaves out links inside a container hidden with visibility: hidden", async () => {
    const expected = await candidates();
    expect(expected.some((s) => s.includes("languages"))).toBe(false);
  });

  it("leaves out the hidden attribute, display: none and a closed details element", async () => {
    const expected = await candidates();
    expect(expected.some((s) => s.includes("hidden-attr"))).toBe(false);
    expect(expected).not.toContain("#gone");
    expect(expected).not.toContain("#in-details");
  });

  it("keeps links clipped by a zero-height container, because Tab still lands on them", async () => {
    const expected = await candidates();
    expect(expected.filter((s) => s.startsWith("#accordion"))).toHaveLength(2);
  });

  it("counts a revealed list once it is visible again", async () => {
    await page.evaluate(() => document.getElementById("languages")!.classList.add("open"));
    const expected = await candidates();
    expect(expected.filter((s) => s.startsWith("#languages"))).toHaveLength(4);
    await page.evaluate(() => document.getElementById("languages")!.classList.remove("open"));
  });
});

describe("walking a page whose hidden content Chrome skips", () => {
  it("does not call collapsed, hidden or closed content unreachable", async () => {
    await load(COLLAPSED);
    const report = await collectKeyboard(page, VIEWPORT, t);

    expect(report.cycleComplete).toBe(true);
    expect(report.findings.map((f) => f.id)).not.toContain("unreachable-control");
    expect(report.focusPath.map((s) => s.selector)).toEqual(
      expect.arrayContaining(["#first", "#toggle", "#last"]),
    );
  });
});

describe("which targets are measured for size", () => {
  const measured = async () =>
    (await page.evaluate(
      (interactive) => window.__accessCheckDom!.collectTargetSizeRaw(interactive),
      INTERACTIVE,
    )) as RawTargetSize;

  it("leaves out targets nobody can see or click", async () => {
    await load(COLLAPSED);
    const selectors = (await measured()).targets.map((target) => target.selector);

    expect(selectors.some((s) => s.includes("languages"))).toBe(false);
    expect(selectors.some((s) => s.includes("accordion"))).toBe(false);
    expect(selectors.some((s) => s.includes("hidden-attr"))).toBe(false);
    expect(selectors).not.toContain("#in-details");
    expect(selectors).toEqual(expect.arrayContaining(["#first", "#toggle", "#last"]));
  });

  it("raises no crowding finding for tiny links that are collapsed away", async () => {
    await load(COLLAPSED);
    expect(analyzeTargetSize(await measured(), t).findings).toEqual([]);
  });

  it("still measures the same tiny links once they are shown", async () => {
    await load(COLLAPSED);
    await page.evaluate(() => document.getElementById("languages")!.classList.add("open"));
    const ids = analyzeTargetSize(await measured(), t).findings.map((f) => f.id);
    expect(ids).toContain("target-size-crowding");
  });
});

describe("reading live regions", () => {
  const read = () => page.evaluate(() => window.__accessCheckDom!.collectLiveRegionsRaw());

  it("reports a region as hidden when an ancestor hides it", async () => {
    await load(LIVE);
    const regions = (await read()).regions;
    expect(regions.find((r) => r.selector === "#inside-hidden")?.hidden).toBe(true);
    expect(regions.find((r) => r.selector === "#thanks")).toMatchObject({
      hidden: true,
      hasText: true,
    });
  });

  it("tells a region on screen with aria-hidden apart from one that starts hidden", async () => {
    await load(LIVE);
    const report = analyzeLiveRegions(await read(), t);
    const byId = Object.fromEntries(report.findings.map((f) => [f.id, f]));

    expect(byId["live-region-hidden"]?.selectors).toEqual(["#silenced"]);
    expect(byId["live-region-conditional"]?.selectors).toEqual(
      expect.arrayContaining(["#thanks", "#inside-hidden", "#silenced-empty"]),
    );
    expect(byId["live-region-conditional"]?.evidence).toBe("heuristic");
    expect(chargeable(report.findings).map((f) => f.id)).toEqual(["live-region-hidden"]);
  });
});
