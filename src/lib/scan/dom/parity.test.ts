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

  server = createServer((_req, res) => {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'; script-src 'self'",
    });
    res.end(FIXTURE);
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
