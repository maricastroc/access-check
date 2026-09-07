import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright-core";
import { acquireBrowser, closeSharedBrowser } from "../browser";
import { collectElementInfo } from "./element-info";
import { collectLiveRegionsRaw } from "./live-regions";
import { collectTargetSizeRaw } from "./target-size";
import { collectRects } from "./rects";
import { INTERACTIVE } from "../target-size";
import { runScan } from "../scan";
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

const BUNDLE = fileURLToPath(new URL("../../../../extension/dist/audit.js", import.meta.url));

let server: Server;
let origin = "";
let browser: Browser;
let page: Page;
const sockets = new Set<Socket>();

beforeAll(async () => {
  execFileSync("node", ["extension/build.mjs"], { stdio: "pipe" });

  server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(FIXTURE);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  browser = await acquireBrowser();
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  page = await context.newPage();
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path: BUNDLE });
}, 60_000);

afterAll(async () => {
  await closeSharedBrowser();
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function throughBundle<T>(call: string): Promise<T> {
  return page.evaluate(`window.__accessCheckEngine.${call}`) as Promise<T>;
}

describe("DOM engine parity: hosted page.evaluate vs the extension bundle", () => {
  it("reads the same live regions", async () => {
    const hosted = await page.evaluate(collectLiveRegionsRaw);
    const extension = await throughBundle("collectLiveRegionsRaw()");
    expect(hosted.regions.length).toBeGreaterThan(0);
    expect(extension).toEqual(hosted);
  });

  it("reads the same element info", async () => {
    const selectors = ["#email", "#shot", "a", "input[type=text]"];
    const hosted = await page.evaluate(collectElementInfo, selectors);
    const extension = await throughBundle(`collectElementInfo(${JSON.stringify(selectors)})`);
    expect(hosted["#shot"].nearbyText).toBe("A caption near the image");
    expect(extension).toEqual(hosted);
  });

  it("measures the same target sizes", async () => {
    const hosted = await page.evaluate(collectTargetSizeRaw, INTERACTIVE);
    const extension = await throughBundle(
      `collectTargetSizeRaw(window.__accessCheckEngine.INTERACTIVE)`,
    );
    expect(hosted.targets.length).toBeGreaterThan(0);
    expect(extension).toEqual(hosted);
  });

  it("measures the same rectangles", async () => {
    const selectors = ["#shot", ".tiny", "a"];
    const hosted = await page.evaluate(collectRects, selectors);
    const extension = await throughBundle(`collectRects(${JSON.stringify(selectors)})`);
    expect(hosted[0]).not.toBeNull();
    expect(extension).toEqual(hosted);
  });

  it("agrees on the interactive selector both sides query", async () => {
    expect(await throughBundle("INTERACTIVE")).toBe(INTERACTIVE);
  });

  it("would fail if the two paths ever disagreed", async () => {
    const other = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const mutated = await other.newPage();
    await mutated.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await mutated.addScriptTag({ path: BUNDLE });

    const before = await mutated.evaluate(collectLiveRegionsRaw);
    await mutated.evaluate(() => {
      const extra = document.createElement("div");
      extra.setAttribute("aria-live", "assertive");
      document.body.append(extra);
    });
    const after = await mutated.evaluate(`window.__accessCheckEngine.collectLiveRegionsRaw()`);

    expect(after).not.toEqual(before);
    await other.close();
  });

  it("keeps every engine function free of module scope, which serialization drops", async () => {
    const fns = [collectLiveRegionsRaw, collectElementInfo, collectTargetSizeRaw, collectRects];
    for (const fn of fns) {
      const rebuilt = await page.evaluate(
        ([source, arg]) => {
          try {
            const f = new Function(`return (${source})`)() as (a: unknown) => unknown;
            f(arg);
            return "ok";
          } catch (e) {
            return e instanceof Error ? e.message : String(e);
          }
        },
        [fn.toString(), fn === collectTargetSizeRaw ? INTERACTIVE : []] as [string, unknown],
      );
      expect(rebuilt, `${fn.name} referenced something outside its own body`).toBe("ok");
    }
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

    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    extension = (await page.evaluate(() => window.__accessCheckAudit!())) as ScanResult;
  }, 90_000);

  it("finds the same violations, with the same fix text and criteria", () => {
    expect(hosted.violations.length).toBeGreaterThan(0);
    expect(extension.violations).toEqual(hosted.violations);
  });

  it("scores and counts the same page the same way", () => {
    expect(extension.score).toBe(hosted.score);
    expect(extension.counts).toEqual(hosted.counts);
    expect(extension.summary).toBe(hosted.summary);
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

  it("does not pass by accident on a fixture the hosted flow checks more deeply", () => {
    expect(hosted.audits?.reducedMotion?.findings ?? []).toEqual([]);
    expect(extension.audits?.reducedMotion).toBeUndefined();
  });

  it("runs the same own-rule audits it can run", () => {
    expect(extension.audits?.targetSize).toEqual(hosted.audits?.targetSize);
    expect(extension.audits?.liveRegions).toEqual(hosted.audits?.liveRegions);
  });

  it("never claims a fix was verified, since it does not write to the page", () => {
    const grouped = extension.violations.flatMap((v) => v.fixGroups ?? []);
    expect(grouped.length).toBeGreaterThan(0);
    expect(grouped.every((g) => g.verification === "unchecked")).toBe(true);
    expect(extension.violations.every((v) => (v.verification ?? "unchecked") === "unchecked")).toBe(
      true,
    );
  });

  it("stamps the scoring model, so a fresh reading is never taken for a legacy one", () => {
    expect(extension.scoringVersion).toBe(SCORING_VERSION);
    expect(hosted.scoringVersion).toBe(SCORING_VERSION);
    expect(JSON.parse(JSON.stringify(extension)).scoringVersion).toBe(SCORING_VERSION);
  });

  it("carries the partial status in the data, not only in the report", () => {
    expect(extension.partial).toBe(true);
    expect(extension.summary).not.toContain("Excellent");
    expect(extension.warnings?.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(extension)).partial).toBe(true);
  });

  it("says out loud what it could not check", () => {
    expect(extension.partial).toBe(true);
    expect(extension.warnings?.map((w) => w.code).sort()).toEqual([
      "audits-skipped",
      "contexts-skipped",
      "keyboard-skipped",
      "verification-skipped",
    ]);
    expect(extension.keyboard).toBeUndefined();
    expect(extension.contexts).toBeUndefined();
    expect(extension.audits?.reducedMotion).toBeUndefined();
  });
});
