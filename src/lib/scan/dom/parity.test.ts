import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "../browser";
import { DOM_ENGINE_VERSION } from "./engine-api";
import type { ElementIdentity } from "./identity";
import { elementLine, identityLabel } from "../../report/identity";
import { translator } from "../../i18n/t";
import { buildFindings } from "../../report/findings";
import { MAX_IDENTIFIED } from "../violations";
import { INTERACTIVE } from "../target-size";
import { injectDomEngine, runScan } from "../scan";
import { SCORING_VERSION } from "../scored";
import type { ScanResult } from "../types";

const FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Parity fixture</title>
    <style>
      .tiny { width: 16px; height: 16px; padding: 0; border: 0; margin: 0; }
      #hidden-status { display: none; }
      .row { display: flex; gap: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Parity fixture</h1>
      <figure>
        <img id="shot" src="/logo.png" />
        <figcaption>A caption near the image</figcaption>
      </figure>
      <form>
        <input id="email" name="email" type="email" placeholder="Your email" />
        <input type="text" aria-label="Search" />
      </form>
      <div class="row">
        <button class="tiny" aria-label="one">1</button>
        <button class="tiny" aria-label="two">2</button>
        <button class="tiny" disabled aria-label="off">3</button>
      </div>
      <a href="/somewhere">A link with <span>nested</span> text</a>
      <div id="hidden-status" role="status" aria-live="polite">hidden status</div>
      <div role="alert" aria-live="off">muted alert</div>
      <div aria-live="sometimes">invalid value</div>
      <div role="log" aria-live="polite" aria-hidden="true">hidden log</div>
    </main>
  </body>
</html>`;

const ROWS = 8;
const ROW_H = 120;

const SCROLLER_FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Scrolling list fixture</title>
    <style>
      body { margin: 0; color: #111827; background: #ffffff; }
      #lead { height: 400px; }
      #list { height: ${ROW_H}px; overflow-y: auto; border: 1px solid #111827; }
      .row { display: flex; align-items: center; gap: 24px; height: ${ROW_H}px; }
      a, button { color: #111827; background: #ffffff; }
    </style>
  </head>
  <body>
    <main>
      <h1>Scrolling list</h1>
      <div id="lead">Tall block above the list.</div>
      <div id="list" tabindex="0" aria-label="Rows">
        ${Array.from(
          { length: ROWS },
          (_, i) =>
            `<div class="row"><a href="/row-${i}">Row ${i}</a><button type="button">Save ${i}</button></div>`,
        ).join("")}
      </div>
      <a href="/after">After the list</a>
    </main>
  </body>
</html>`;

const TALL_FIXTURE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tall page</title>
    <style>
      body { margin: 0; background: #ffffff; color: #111827 }
      header { position: sticky; top: 0; height: 64px; background: #14342b; color: #f4efe2 }
      .band { height: 760px; border-bottom: 1px solid #e5e7eb; padding: 16px }
      .faint { color: #b4b4b4; background: #ffffff }
    </style>
  </head>
  <body>
    <header>Sticky header</header>
    <main>
      <div class="band"><h1>Tall page</h1><a href="/near">Near the top</a></div>
      <div class="band"><a href="/mid">Halfway down</a><p class="faint">Low contrast halfway down.</p></div>
      <div class="band"><a href="/deep">Deep down</a><img src="/deep.png" /></div>
      <div class="band"><a href="/deeper">Deeper still</a></div>
    </main>
  </body>
</html>`;

const repoFile = (rel: string) => fileURLToPath(new URL(`../../../../${rel}`, import.meta.url));

const HOSTED_ENGINE = repoFile("dom-engine/dom-engine.js");
const EXTENSION_ENGINE = repoFile("extension/dist/dom-engine.js");
const EXTENSION_AUDIT = repoFile("extension/dist/audit.js");

const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

let server: Server;
let origin = "";
let browser: Browser;
let page: Page;
const sockets = new Set<Socket>();

beforeAll(async () => {
  execFileSync("node", ["extension/build.mjs"], { stdio: "pipe" });

  server = createServer((req, res) => {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'; script-src 'self'",
    });
    const path = req.url ?? "";
    res.end(
      path.startsWith("/scroller")
        ? SCROLLER_FIXTURE
        : path.startsWith("/tall")
          ? TALL_FIXTURE
          : FIXTURE,
    );
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  browser = await acquireBrowser();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    bypassCSP: true,
  });
  page = await context.newPage();
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path: HOSTED_ENGINE });
}, 90_000);

afterAll(async () => {
  await closeSharedBrowser();
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("the two environments load one artifact", () => {
  it("ships the same bytes to the scanner and to the extension", () => {
    expect(existsSync(HOSTED_ENGINE)).toBe(true);
    expect(existsSync(EXTENSION_ENGINE)).toBe(true);
    expect(sha(EXTENSION_ENGINE)).toBe(sha(HOSTED_ENGINE));
  });

  it("matches the hash the build recorded", () => {
    const recorded = readFileSync(repoFile("dom-engine/dom-engine.sha256"), "utf8").trim();
    expect(sha(HOSTED_ENGINE).slice(0, 16)).toBe(recorded);
  });

  it("carries no Node, Playwright, Next or extension code", () => {
    const source = readFileSync(HOSTED_ENGINE, "utf8");
    for (const forbidden of ["playwright", "node:", "process.env", "chrome.", "fetch(", "next/"]) {
      expect(source, `engine contains ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("holds one copy of the DOM helpers, and the audit bundle adds none", () => {
    const engine = readFileSync(HOSTED_ENGINE, "utf8");
    const audit = readFileSync(EXTENSION_AUDIT, "utf8");
    const copies = (text: string) => text.split("nth-of-type").length - 1;

    expect(copies(engine)).toBe(1);
    expect(copies(audit)).toBe(0);
  });

  it.skipIf(!existsSync(repoFile(".next/server/app/api/scan/route.js.nft.json")))(
    "is traced into the serverless bundle, next to axe-core",
    () => {
      const trace = JSON.parse(
        readFileSync(repoFile(".next/server/app/api/scan/route.js.nft.json"), "utf8"),
      ) as { files: string[] };

      expect(trace.files.some((f) => f.endsWith("dom-engine/dom-engine.js"))).toBe(true);
      expect(trace.files.some((f) => f.endsWith("axe-core/axe.min.js"))).toBe(true);
    },
  );

  it("announces its version so a mismatched pair fails loudly", async () => {
    expect(await page.evaluate(() => window.__accessCheckDom?.version)).toBe(DOM_ENGINE_VERSION);
  });

  it("loads under a strict CSP", async () => {
    expect(await page.evaluate(() => typeof window.__accessCheckDom?.cssPath)).toBe("function");
  });
});

describe("the engine reads the page the same way from either caller", () => {
  it("reads live regions", async () => {
    const raw = await page.evaluate(() => window.__accessCheckDom!.collectLiveRegionsRaw());
    expect(raw.regions.length).toBeGreaterThan(0);
  });

  it("reads element info", async () => {
    const info = await page.evaluate(
      (selectors) => window.__accessCheckDom!.collectElementInfo(selectors),
      ["#shot"],
    );
    expect(info["#shot"].nearbyText).toBe("A caption near the image");
  });

  it("measures target sizes and rectangles", async () => {
    const targets = await page.evaluate(
      (interactive) => window.__accessCheckDom!.collectTargetSizeRaw(interactive),
      INTERACTIVE,
    );
    const rects = await page.evaluate(
      (selectors) => window.__accessCheckDom!.collectRects(selectors),
      ["#shot"],
    );

    expect(targets.targets.length).toBeGreaterThan(0);
    expect(rects[0]).not.toBeNull();
  });
});

describe("ScanResult parity: hosted runScan vs the extension bundle", () => {
  let hosted: ScanResult;
  let extension: ScanResult;

  beforeAll(async () => {
    hosted = await runScan(`${origin}/`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      verifyFixes: false,
    });

    await page.addScriptTag({ path: repoFile("node_modules/axe-core/axe.min.js") });
    await page.addScriptTag({ path: EXTENSION_AUDIT });
    extension = (await page.evaluate(() => window.__accessCheckAudit!())) as ScanResult;
  }, 90_000);

  it("finds the same violations, with the same fix text and criteria", () => {
    expect(hosted.violations.length).toBeGreaterThan(0);
    expect(extension.violations).toEqual(hosted.violations);
  });

  it("scores and counts the same page the same way", () => {
    expect(extension.score).toBe(hosted.score);
    expect(extension.counts).toEqual(hosted.counts);
    expect(extension.fixFirst).toEqual(hosted.fixFirst);
  });

  it("reports the same manual-review and best-practice items", () => {
    expect(extension.incomplete).toEqual(hosted.incomplete);
    expect(extension.bestPractice).toEqual(hosted.bestPractice);
    expect(extension.passed).toEqual(hosted.passed);
  });

  it("places the same markers when the viewport matches", () => {
    expect(extension.markers).toEqual(hosted.markers);
  });

  it("names the affected elements the same way in both", () => {
    expect(Object.keys(hosted.identities ?? {}).length).toBeGreaterThan(0);
    expect(extension.identities).toEqual(hosted.identities);
  });

  it("gives every element a report points at a name a person can read", () => {
    const t = translator("en");
    for (const finding of buildFindings(hosted)) {
      for (const selector of finding.affectedSelectors.slice(0, MAX_IDENTIFIED)) {
        const identity = hosted.identities?.[selector];
        expect(identity, `${finding.ruleId} left ${selector} unnamed`).toBeDefined();
        const label = identityLabel(identity!, t);
        expect(label, `${finding.ruleId} reads as a path`).not.toContain(" > ");
        expect(label).not.toContain(":nth-of-type");
      }
    }
  });

  it("runs the same own-rule audits it can run", () => {
    expect(extension.audits?.targetSize).toEqual(hosted.audits?.targetSize);
    expect(extension.audits?.liveRegions).toEqual(hosted.audits?.liveRegions);
  });

  it("does not pass by accident on a fixture the hosted flow checks more deeply", () => {
    expect(hosted.audits?.reducedMotion?.findings ?? []).toEqual([]);
    expect(extension.audits?.reducedMotion).toBeUndefined();
  });

  it("stamps the scoring model on both", () => {
    expect(extension.scoringVersion).toBe(SCORING_VERSION);
    expect(hosted.scoringVersion).toBe(SCORING_VERSION);
  });

  it("carries the partial status in the data, not only in the report", () => {
    expect(extension.partial).toBe(true);
    expect(extension.summary).not.toContain("Excellent");
    expect(JSON.parse(JSON.stringify(extension)).partial).toBe(true);
  });
});

describe("a missing engine fails in the open", () => {
  it("tells the hosted scanner how to build it", async () => {
    await expect(injectDomEngine(page, repoFile("dom-engine/never-built.js"))).rejects.toThrow(
      /audit engine could not be loaded[\s\S]*build:engine/,
    );
  });

  it("still has the real engine in place for everyone else", () => {
    expect(existsSync(HOSTED_ENGINE)).toBe(true);
  });
});

describe("a coordinate that survives a container scrolling under it", () => {
  let scroller: Page;

  beforeAll(async () => {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      bypassCSP: true,
    });
    scroller = await context.newPage();
    await scroller.goto(`${origin}/scroller`, { waitUntil: "domcontentloaded" });
    await scroller.addScriptTag({ path: HOSTED_ENGINE });
  }, 90_000);

  const focusRow = (index: number) =>
    scroller.evaluate((i) => {
      document.querySelectorAll<HTMLElement>(".row a")[i].focus();
      return window.__accessCheckDom!.readFocusedStop();
    }, index);

  const readFocused = () =>
    scroller.evaluate(() => window.__accessCheckDom!.readFocusedStop(false));

  const listTop = () => scroller.evaluate(() => document.getElementById("list")!.scrollTop);

  it("keeps the flow position moving forward while the painted one stands still", async () => {
    const first = await focusRow(0);
    const last = await focusRow(ROWS - 1);

    expect(first.rect?.flowY).toBeDefined();
    expect(last.rect!.flowY! - first.rect!.flowY!).toBeCloseTo((ROWS - 1) * ROW_H, 0);
    expect(Math.abs(last.rect!.docY - first.rect!.docY)).toBeLessThan(2);
  });

  it("reads the same flow position wherever the container happens to be scrolled", async () => {
    const before = await focusRow(3);
    await scroller.evaluate(() => {
      document.getElementById("list")!.scrollTop = 0;
    });
    const after = await readFocused();

    expect(after.rect!.flowY!).toBeCloseTo(before.rect!.flowY!, 0);
    expect(after.rect!.docY).not.toBeCloseTo(before.rect!.docY, 0);
  });

  it("marks the stops that live inside a scrolling container", async () => {
    const inside = await focusRow(2);
    await scroller.evaluate(() => document.getElementById("list")!.focus());
    const outside = await readFocused();

    expect(inside.rect?.scrolled).toBe(true);
    expect(outside.rect?.scrolled).toBe(false);
    expect(inside.rect?.flowContext).toContain("list");
    expect(outside.rect?.flowContext).toBe("");
  });

  it("gives every stop in one container the same context, and none to the rest", async () => {
    const rows = await Promise.all([focusRow(0), focusRow(ROWS - 1)]);
    await scroller.evaluate(() => document.querySelector<HTMLElement>('a[href="/after"]')!.focus());
    const after = await readFocused();

    expect(rows[0].rect!.flowContext).toBe(rows[1].rect!.flowContext);
    expect(after.rect!.flowContext).not.toBe(rows[0].rect!.flowContext);
  });

  it("keeps the painted rectangle relative to the viewport", async () => {
    await scroller.evaluate(() => {
      document.getElementById("list")!.scrollTop = 240;
      window.scrollTo(0, 120);
    });

    const measured = await scroller.evaluate(() =>
      window.__accessCheckDom!.collectRects([".row a"]),
    );
    const painted = await scroller.evaluate(() => {
      const r = document.querySelector(".row a")!.getBoundingClientRect();
      return { x: r.left, y: r.top };
    });

    expect(measured[0]!.x).toBe(painted.x);
    expect(measured[0]!.y).toBe(painted.y);
  });

  it("puts the container back where the reader had left it", async () => {
    await scroller.evaluate(() => {
      document.getElementById("list")!.scrollTop = 360;
      window.scrollTo(0, 0);
      window.__accessCheckDom!.focusProbeStart();
    });

    await focusRow(ROWS - 1);
    expect(await listTop()).not.toBe(360);

    await scroller.evaluate(() => window.__accessCheckDom!.focusProbeEnd());
    expect(await listTop()).toBe(360);
  });
});

describe("verifying a fix leaves the page exactly as it was", () => {
  const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Revert</title></head>
<body><main><h1>Revert</h1>
  <p id="bare">no style attribute</p>
  <p id="styled" style="margin:0">already styled</p>
  <img id="pic" src="/logo.png">
</main></body></html>`;

  let revert: Page;

  beforeAll(async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    revert = await context.newPage();
    await revert.setContent(FIXTURE);
    await revert.addScriptTag({ path: HOSTED_ENGINE });
    await revert.addScriptTag({ path: repoFile("node_modules/axe-core/axe.min.js") });
  }, 90_000);

  const markupAround = async (run: () => Promise<unknown>) => {
    const before = await revert.evaluate(() => document.body.innerHTML);
    await run();
    const after = await revert.evaluate(() => document.body.innerHTML);
    return { before, after };
  };

  it("adds no style attribute to an element that had none", async () => {
    const { before, after } = await markupAround(() =>
      revert.evaluate(() =>
        window.__accessCheckDom!.verifyFixes([
          {
            ruleId: "color-contrast",
            selector: "#bare",
            apply: { kind: "style", prop: "color", value: "#111827" },
          },
        ]),
      ),
    );

    expect(after).toBe(before);
    expect(after).not.toContain('id="bare" style');
  });

  it("puts a style attribute it did touch back byte for byte", async () => {
    const { before, after } = await markupAround(() =>
      revert.evaluate(() =>
        window.__accessCheckDom!.verifyFixes([
          {
            ruleId: "color-contrast",
            selector: "#styled",
            apply: { kind: "style", prop: "color", value: "#111827" },
          },
        ]),
      ),
    );

    expect(after).toBe(before);
    expect(after).toContain('style="margin:0"');
  });

  it("puts an attribute it added back the way it found it", async () => {
    const { before, after } = await markupAround(() =>
      revert.evaluate(() =>
        window.__accessCheckDom!.verifyFixes([
          {
            ruleId: "image-alt",
            selector: "#pic",
            apply: { kind: "attr", name: "alt", value: "A logo" },
          },
        ]),
      ),
    );

    expect(after).toBe(before);
    expect(after).not.toContain("alt=");
  });

  it("says unchecked, not failed, when the element is gone", async () => {
    const [outcome] = await revert.evaluate(() =>
      window.__accessCheckDom!.verifyFixes([
        {
          ruleId: "image-alt",
          selector: "#vanished",
          apply: { kind: "attr", name: "alt", value: "x" },
        },
      ]),
    );

    expect(outcome).toBe("unchecked");
  });

  it("tells a fix that clears the rule apart from one that does not", async () => {
    const outcomes = await revert.evaluate(() =>
      window.__accessCheckDom!.verifyFixes([
        {
          ruleId: "image-alt",
          selector: "#pic",
          apply: { kind: "attr", name: "alt", value: "A logo" },
        },
        {
          ruleId: "html-has-lang",
          selector: null,
          apply: { kind: "doc", target: "lang", value: "en" },
        },
      ]),
    );

    expect(outcomes[0]).toBe("verified");
    expect(outcomes).not.toContain("failed");
  });
});

describe("naming the element a developer has to find", () => {
  const ROWS_IN_FEED = 8;

  const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Identity</title>
<style>#feed { height: 80px; overflow-y: auto } .row { height: 60px }</style></head>
<body>
  <header>
    <nav aria-label="Primary">
      <a href="/docs/getting-started">Get started</a>
      <button class="sc-fznKkj hLSTQF css-1x2y3z" id=":r7:">Sign in</button>
    </nav>
  </header>
  <main>
    <section id="pricing">
      <h2>Pricing</h2>
      <ul>
        <li class="card"><h3>Starter</h3><a href="/signup">Read more</a></li>
        <li class="card"><h3>Team</h3><a href="/signup">Read more</a></li>
        <li class="card"><h3>Scale</h3><a href="/signup">Read more</a></li>
      </ul>
      <p class="mt-2 lg:my-16 dark:bg-card text-gray-30 xs:p-5 flex-col">Utility soup</p>
    </section>
    <section aria-label="Feed">
      <div id="feed">${Array.from(
        { length: ROWS_IN_FEED },
        (_, i) => `<div class="row"><a href="/row-${i}">Row ${i}</a></div>`,
      ).join("")}</div>
    </section>
    <section id="account">
      <h2>Account</h2>
      <form>
        <label for=":r0:">Email address</label>
        <input id=":r0:" name="email" type="email">
        <button class="icon" type="button" aria-label="Close dialog"></button>
        <button class="icon" type="button" aria-label="Close banner"></button>
      </form>
    </section>
    <div id="__next"><div class="jsx-2947419541">
      <a class="sc-bdVaJa gBdqXv" href="/blog/2026/release" data-testid="release-link">Read the release notes</a>
    </div></div>
  </main>
</body></html>`;

  let named: Page;

  beforeAll(async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    named = await context.newPage();
    await named.setContent(FIXTURE);
    await named.addScriptTag({ path: HOSTED_ENGINE });
  }, 90_000);

  const read = (selectors: string[]) =>
    named.evaluate(
      (list) => window.__accessCheckDom!.collectIdentities(list),
      selectors,
    ) as Promise<Record<string, ElementIdentity>>;

  const line = async (selector: string) => {
    const identity = (await read([selector]))[selector];
    return elementLine(selector, identity, translator("en"));
  };

  it("ignores generated and utility classes instead of reciting them", async () => {
    expect(await line("nav button")).toBe("button “Sign in” · in <nav> “Primary”");
    expect(await line("#pricing p")).toBe("p “Utility soup” · in <section> “Pricing”");
  });

  it("refuses a framework-generated id and finds a real signal instead", async () => {
    const identity = (await read(["#pricing ~ * input"]))["#pricing ~ * input"];
    expect(identity.ref).toBe('[name="email"]');
    expect(identity.name).toBe("Email address");
  });

  it("numbers repeated components that would otherwise read identically", async () => {
    const selectors = [1, 2, 3].map((n) => `#pricing li:nth-of-type(${n}) a`);
    const identities = await read(selectors);
    expect(selectors.map((s) => identityLabel(identities[s], translator("en")))).toEqual([
      'a[href*="signup"] “Read more” 1 of 3',
      'a[href*="signup"] “Read more” 2 of 3',
      'a[href*="signup"] “Read more” 3 of 3',
    ]);
  });

  it("leaves elements alone when their names already tell them apart", async () => {
    const selectors = ["button.icon:nth-of-type(1)", "button.icon:nth-of-type(2)"];
    const identities = await read(selectors);
    expect(identities[selectors[0]].of).toBeNull();
    expect(identityLabel(identities[selectors[0]], translator("en"))).toBe(
      "button.icon “Close dialog”",
    );
    expect(identityLabel(identities[selectors[1]], translator("en"))).toBe(
      "button.icon “Close banner”",
    );
  });

  it("names an element sitting below the fold of a scroll container", async () => {
    const last = `#feed .row:nth-of-type(${ROWS_IN_FEED}) a`;
    expect(await line(last)).toBe(
      `a[href*="row-${ROWS_IN_FEED - 1}"] “Row ${ROWS_IN_FEED - 1}” · in <section> “Feed”`,
    );
  });

  it("prefers a test id over the class chain React ships", async () => {
    expect(await line("#__next a")).toBe(
      'a[data-testid="release-link"] “Read the release notes” · in <main>',
    );
  });

  it("names every element it is asked about without repeating a class chain", async () => {
    const selectors = [
      "nav a",
      "nav button",
      "#pricing li:nth-of-type(2) a",
      "#feed .row:nth-of-type(3) a",
      "#__next a",
    ];
    const identities = await read(selectors);
    const t = translator("en");

    for (const selector of selectors) {
      const label = identityLabel(identities[selector], t);
      expect(label.length).toBeLessThanOrEqual(64);
      for (const generated of ["sc-", "css-", "jsx-", "hLSTQF", "gBdqXv", "lg\\:", "dark\\:"]) {
        expect(label, `${selector} leaked ${generated}`).not.toContain(generated);
      }
    }
  });
});

describe("reading the page geometry a contextual capture needs", () => {
  let geometry: Page;

  const TALL = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tall</title>
<style>
  body { margin: 0 }
  header { position: sticky; top: 0; height: 64px; background: #14342b; color: #fff }
  .band { height: 900px; border-bottom: 1px solid #ccc }
  #feed { height: 120px; overflow-y: auto }
  .row { height: 200px }
</style></head>
<body>
  <header>Sticky</header>
  <div class="band" id="one">one</div>
  <div class="band" id="two"><button id="deep">Deep button</button></div>
  <div id="feed"><div class="row"><a id="inside" href="/x">Inside a scroller</a></div><div class="row">b</div></div>
  <div class="band" id="three">three</div>
</body></html>`;

  beforeAll(async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    geometry = await context.newPage();
    await geometry.setContent(TALL);
    await geometry.addScriptTag({ path: HOSTED_ENGINE });
  }, 90_000);

  it("gives every rectangle its document position", async () => {
    const [rect] = await geometry.evaluate(
      (selectors) => window.__accessCheckDom!.collectRects(selectors),
      ["#deep"],
    );

    expect(rect).not.toBeNull();
    expect(rect!.docY).toBeGreaterThan(900);
    expect(rect!.scrolled).toBe(false);
  });

  it("says when a rectangle lives inside something that scrolls on its own", async () => {
    const [rect] = await geometry.evaluate(
      (selectors) => window.__accessCheckDom!.collectRects(selectors),
      ["#inside"],
    );

    expect(rect!.scrolled).toBe(true);
  });

  it("measures the sticky header without changing the page", async () => {
    const before = await geometry.evaluate(() => document.body.innerHTML);
    const inset = await geometry.evaluate(() => window.__accessCheckDom!.stickyInset());
    const after = await geometry.evaluate(() => document.body.innerHTML);

    expect(inset).toBeGreaterThanOrEqual(64);
    expect(after).toBe(before);
  });

  it("scrolls to a document position and reports where it landed", async () => {
    const landed = await geometry.evaluate(() => window.__accessCheckDom!.scrollToDocY(1_200));
    expect(landed).toBe(1_200);

    const past = await geometry.evaluate(() => window.__accessCheckDom!.scrollToDocY(999_999));
    const height = await geometry.evaluate(() => window.__accessCheckDom!.documentHeight());
    expect(past).toBe(height - 800);

    await geometry.evaluate(() => window.__accessCheckDom!.scrollToDocY(0));
  });

  it("reports a different rectangle once the page has scrolled, and the same document position", async () => {
    const at = (docY: number) =>
      geometry.evaluate((y) => {
        window.__accessCheckDom!.scrollToDocY(y);
        return window.__accessCheckDom!.collectRects(["#deep"])[0];
      }, docY);

    const top = await at(0);
    const near = await at(900);
    await geometry.evaluate(() => window.__accessCheckDom!.scrollToDocY(0));

    expect(near!.y).not.toBe(top!.y);
    expect(Math.round(near!.docY)).toBe(Math.round(top!.docY));
  });
});

describe("capturing the parts of a page the first screenshot cannot reach", () => {
  let tall: ScanResult;

  beforeAll(async () => {
    tall = await runScan(`${origin}/tall`, {
      screenshot: true,
      keyboard: true,
      contexts: false,
      audits: false,
      verifyFixes: false,
      budgetMs: 90_000,
    });
  }, 120_000);

  it("photographs the areas that hold something worth pointing at", () => {
    const regions = tall.regions ?? [];
    expect(regions.length).toBeGreaterThan(0);
    expect(regions.every((r) => r.docY > 0)).toBe(true);
    expect(regions.some((r) => r.image !== null)).toBe(true);
  });

  it("names the capture each marker was measured in", () => {
    expect(tall.markers.length).toBeGreaterThan(0);
    for (const marker of tall.markers) expect(marker.captureId).toBeTruthy();
  });

  it("places stops from the page as it stood when the picture was taken", () => {
    const captured = (tall.regions ?? []).filter((r) => r.image !== null);
    const placed = captured.flatMap((r) => r.stops);

    expect(placed.length).toBeGreaterThan(0);
    for (const stop of placed) {
      expect(stop.top).toBeGreaterThanOrEqual(0);
      expect(stop.top).toBeLessThanOrEqual(100);
      expect(stop.left).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves the reader's scroll position alone", () => {
    expect(tall.warnings?.some((w) => w.code === "walk-changed-page")).not.toBe(true);
  });

  it("offers no way to hide a fixed element to make a nicer picture", () => {
    const engine = readFileSync(HOSTED_ENGINE, "utf8");
    for (const mutation of ["freezeOverlays", "restoreOverlays", 'visibility = "hidden"']) {
      expect(engine, `engine can ${mutation}`).not.toContain(mutation);
    }
  });
});
