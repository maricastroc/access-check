import { createServer, type Server } from "http";
import type { AddressInfo, Socket } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runScan, ScanFailure } from "./scan";
import { scoredViolations } from "./scored";
import { closeSharedBrowser, getBrowserExecutor, setBrowserExecutor } from "./browser";
import type { Browser, BrowserContext } from "playwright-core";

const TALL_BODY = Array.from(
  { length: 4000 },
  (_, i) => `<p style="color:#111827;background:#ffffff">Row ${i} of a very long document.</p>`,
).join("");

const SCROLL_ROWS = 8;
const SCROLL_ROW_H = 120;

const SCROLLING_LIST = Array.from(
  { length: SCROLL_ROWS },
  (_, i) =>
    `<div class="row"><a href="/row-${i}">Row ${i}</a><button type="button">Save ${i}</button></div>`,
).join("");

const PAGES: Record<string, { status?: number; html: string }> = {
  "/scroller": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Scrolling list fixture</title>
    <style>
      body { margin: 0; color: #111827; background: #ffffff; }
      #lead { height: 400px; }
      #list { height: ${SCROLL_ROW_H}px; overflow-y: auto; border: 1px solid #111827; }
      .row { display: flex; align-items: center; gap: 24px; height: ${SCROLL_ROW_H}px; }
      a, button { color: #111827; background: #ffffff; }
    </style>
  </head>
  <body>
    <main>
      <h1>Scrolling list</h1>
      <div id="lead">Tall block above the list.</div>
      <div id="list" tabindex="0" aria-label="Rows">${SCROLLING_LIST}</div>
      <a href="/after">After the list</a>
    </main>
  </body>
</html>`,
  },
  "/inverted": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inverted order fixture</title>
    <style>
      body { margin: 0; color: #111827; background: #ffffff; }
      .reversed { display: flex; flex-direction: row-reverse; gap: 24px; }
      a { color: #111827; background: #ffffff; }
    </style>
  </head>
  <body>
    <main>
      <h1>Reversed row</h1>
      <div class="reversed">
        <a href="/one">First in the DOM, painted on the right</a>
        <a href="/two">Second in the DOM, painted on the left</a>
      </div>
    </main>
  </body>
</html>`,
  },
  "/broken": {
    html: `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <main>
      <h1>Fixture</h1>
      <img src="/logo.png" />
      <p style="color:#bbbbbb;background:#ffffff;margin:0;font-size:16px">
        texto de baixo contraste
      </p>
    </main>
  </body>
</html>`,
  },
  "/clean": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Clean fixture</title>
  </head>
  <body>
    <main>
      <h1>Accessible page</h1>
      <p style="color:#111827;background:#ffffff">High contrast copy that reads well.</p>
      <img src="/logo.png" alt="Company logo" />
    </main>
  </body>
</html>`,
  },
  "/gone": {
    status: 404,
    html: `<!doctype html><html lang="en"><head><title>Gone</title></head><body>not found</body></html>`,
  },
  "/audits": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Audits fixture</title>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      #spinner { width: 40px; height: 40px; animation: spin 1s linear infinite; }
      .tiny { width: 16px; height: 16px; padding: 0; border: 0; margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Audits fixture</h1>
      <div id="spinner" aria-label="Loading"></div>
      <div>
        <button class="tiny" aria-label="one">1</button
        ><button class="tiny" aria-label="two">2</button>
      </div>
      <div role="status" aria-live="polite" style="display:none">hidden status</div>
    </main>
  </body>
</html>`,
  },
  "/own-rules-only": {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Own rules only</title>
    <style>
      body { color: #111827; background: #ffffff; }
    </style>
  </head>
  <body>
    <main>
      <h1>Nothing here fails axe</h1>
      <p>High contrast copy, a title, a lang attribute and a labelled image.</p>
      <img src="/logo.png" alt="Company logo" />
      <div role="status" aria-live="polite" style="display:none">Saved</div>
      <div role="log" aria-live="polite" aria-hidden="true">History</div>
    </main>
  </body>
</html>`,
  },
  "/tall": {
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Tall fixture</title></head>
  <body><main><h1>Tall document</h1><img src="/logo.png" />${TALL_BODY}</main></body>
</html>`,
  },
  "/dynamic": {
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Dynamic fixture</title></head>
  <body>
    <div id="root"></div>
    <script>
      setTimeout(function () {
        document.getElementById("root").innerHTML =
          '<main><h1>Rendered later</h1><img src="/logo.png"><button></button></main>';
      }, 400);
    </script>
  </body>
</html>`,
  },
  "/grows": {
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Growing fixture</title>
    <style>body{margin:0} section{height:1800px;background:#ffffff}</style>
  </head>
  <body>
    <main><section><h1>Grows</h1><img src="/logo.png" /></section><section></section></main>
    <script>
      setTimeout(function () {
        var extra = document.createElement("section");
        extra.style.height = "5000px";
        document.querySelector("main").appendChild(extra);
      }, 1200);
    </script>
  </body>
</html>`,
  },
  "/stuck-asset": {
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Stuck asset fixture</title></head>
  <body><main><h1>Loads despite a hanging asset</h1><img src="/hangs-forever" /></main></body>
</html>`,
  },
};

const SLOW_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Slow fixture</title></head>
  <body><main><h1>Slow to arrive</h1><img src="/logo.png" /></main></body>
</html>`;

const SLOW_DELAY_MS = 2_000;

let server: Server;
let base: string;
const sockets = new Set<Socket>();
const pending = new Set<ReturnType<typeof setTimeout>>();

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = req.url ?? "";

    if (path === "/hangs-forever") return;

    if (path === "/slow") {
      const timer = setTimeout(() => {
        pending.delete(timer);
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(SLOW_HTML);
      }, SLOW_DELAY_MS);
      pending.add(timer);
      return;
    }

    const page = PAGES[path];
    if (!page) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.statusCode = page.status ?? 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(page.html);
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await closeSharedBrowser();
  for (const timer of pending) clearTimeout(timer);
  pending.clear();
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("runScan (integration — real browser)", () => {
  it("detects known violations and proves fixes by re-running axe on the DOM", async () => {
    const result = await runScan(`${base}/broken`, {
      screenshot: true,
      keyboard: false,
      contexts: false,
      verifyFixes: true,
    });

    const ids = result.violations.map((v) => v.id);
    expect(ids).toContain("image-alt");
    expect(ids).toContain("html-has-lang");

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(100);
    expect(result.counts.critical).toBeGreaterThanOrEqual(1);

    expect(result.screenshot).toMatch(/^data:image\/jpeg;base64,/);

    const verified = result.violations.filter((v) => v.verification === "verified");
    expect(verified.length).toBeGreaterThan(0);
  }, 60_000);

  it("re-audits only deterministic fixes, and never certifies an invented lang or a guessed alt", async () => {
    const result = await runScan(`${base}/broken`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: true,
    });

    const byId = Object.fromEntries(result.violations.map((v) => [v.id, v]));
    expect(byId["color-contrast"].fixConfidence).toBe("deterministic");
    expect(byId["color-contrast"].verification).toBe("verified");

    expect(byId["html-has-lang"].fixConfidence).toBe("suggested");
    expect(byId["html-has-lang"].fixCode).not.toMatch(/lang="[a-z]/);
    expect(byId["html-has-lang"].verification).toBe("unchecked");

    expect(byId["image-alt"].fixConfidence).toBe("contextual");
    expect(byId["image-alt"].verification).toBe("unchecked");

    for (const v of result.violations) {
      for (const g of v.fixGroups ?? []) {
        if (g.verification !== "unchecked") expect(g.confidence).toBe("deterministic");
      }
    }
  }, 60_000);

  it("emits progress phases in order for streaming", async () => {
    const phases: string[] = [];
    await runScan(`${base}/clean`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
      onPhase: (p) => phases.push(p),
    });
    expect(phases).toEqual(["preparing", "loading", "auditing", "processing", "finalizing"]);
  }, 60_000);

  it("emits a core result before the deep passes, full result after", async () => {
    let core: Awaited<ReturnType<typeof runScan>> | undefined;
    const full = await runScan(`${base}/clean`, {
      screenshot: false,
      keyboard: true,
      contexts: false,
      audits: true,
      verifyFixes: false,
      onCore: (c) => {
        core = c;
      },
    });

    expect(core).toBeDefined();
    expect(core?.violations).toBeDefined();
    expect(core?.keyboard).toBeUndefined();
    expect(core?.audits).toBeUndefined();
    expect(full.keyboard).toBeDefined();
    expect(full.audits).toBeDefined();
  }, 60_000);

  it("aborts with an HTTP message when the page responds 4xx", async () => {
    await expect(runScan(`${base}/gone`)).rejects.toThrow(/HTTP 404/);
  }, 60_000);

  it("an accessible page produces no WCAG violation and scores high", async () => {
    const result = await runScan(`${base}/clean`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });
    expect(result.counts.critical).toBe(0);
    expect(result.score).toBeGreaterThan(90);
  }, 60_000);

  it("own detection engine flags what axe misses (target size, motion, live region)", async () => {
    const result = await runScan(`${base}/audits`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: true,
      verifyFixes: false,
    });

    const a = result.audits;
    expect(a).toBeDefined();

    const target = a?.targetSize?.findings.find((f) => f.id === "target-size-crowding");
    expect(target?.count).toBe(2);

    const motion = a?.reducedMotion?.findings.find((f) => f.id === "reduced-motion");
    expect(motion?.selectors).toContain("#spinner");

    const live = a?.liveRegions?.findings.find((f) => f.id === "live-region-hidden");
    expect(live?.count).toBe(1);

    expect(typeof result.score).toBe("number");
  }, 60_000);
});

describe("runScan (budget, degradation and resilience)", () => {
  it("recycles the browser and retries once when the page cannot be created", async () => {
    await closeSharedBrowser();
    const real = getBrowserExecutor();
    let launches = 0;

    const bindThrough = (target: object, prop: string | symbol, receiver: unknown) => {
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    };

    setBrowserExecutor({
      async launch() {
        launches += 1;
        const browser = await real.launch();
        if (launches > 1) return browser;

        return new Proxy(browser, {
          get(target, prop, receiver) {
            if (prop !== "newContext") return bindThrough(target, prop, receiver);
            return async (...args: unknown[]) => {
              const context = await (
                target.newContext as (...a: unknown[]) => Promise<BrowserContext>
              )(...args);
              return new Proxy(context, {
                get(ctx, key, ref) {
                  if (key !== "newPage") return bindThrough(ctx, key, ref);
                  return async () => {
                    throw new Error("Target page, context or browser has been closed");
                  };
                },
              });
            };
          },
        });
      },
    });

    try {
      let timings: Record<string, number> = {};
      const result = await runScan(`${base}/clean`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: false,
        verifyFixes: false,
        onTimings: (t) => {
          timings = t;
        },
      });

      expect(launches).toBe(2);
      expect(timings.browserRecycled).toBe(1);
      expect(result.title).toBe("Clean fixture");
    } finally {
      setBrowserExecutor(real);
      await closeSharedBrowser();
    }
  }, 90_000);

  it("gives up after a single retry when the browser never recovers", async () => {
    await closeSharedBrowser();
    const real = getBrowserExecutor();
    let launches = 0;

    setBrowserExecutor({
      async launch() {
        launches += 1;
        throw new Error("Target page, context or browser has been closed");
      },
    });

    try {
      await expect(runScan(`${base}/clean`)).rejects.toThrow(/has been closed/);
      expect(launches).toBe(2);
    } finally {
      setBrowserExecutor(real);
      await closeSharedBrowser();
    }
  }, 60_000);

  it("restarts the browser and still delivers when it dies mid-scan", async () => {
    await closeSharedBrowser();
    const real = getBrowserExecutor();
    let launches = 0;
    let opened: Browser | null = null;

    setBrowserExecutor({
      async launch() {
        launches += 1;
        opened = await real.launch();
        return opened;
      },
    });

    try {
      const result = await runScan(`${base}/broken`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: false,
        verifyFixes: false,
        onPhase: (p) => {
          if (p === "loading" && launches === 1) void opened?.close().catch(() => undefined);
        },
      });

      expect(launches).toBe(2);
      expect(result.violations.map((v) => v.id)).toContain("image-alt");
    } finally {
      setBrowserExecutor(real);
      await closeSharedBrowser();
    }
  }, 60_000);

  it("reports an unavailable browser when it keeps dying mid-scan", async () => {
    await closeSharedBrowser();
    const real = getBrowserExecutor();
    let opened: Browser | null = null;

    setBrowserExecutor({
      async launch() {
        opened = await real.launch();
        return opened;
      },
    });

    try {
      const err = await runScan(`${base}/clean`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: false,
        verifyFixes: false,
        onPhase: (p) => {
          if (p === "loading") void opened?.close().catch(() => undefined);
        },
      }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ScanFailure);
      expect((err as ScanFailure).code).toBe("browser-unavailable");
    } finally {
      setBrowserExecutor(real);
      await closeSharedBrowser();
    }
  }, 60_000);

  it("reports an unavailable browser when it dies during navigation", async () => {
    await closeSharedBrowser();
    const real = getBrowserExecutor();
    let opened: Browser | null = null;

    setBrowserExecutor({
      async launch() {
        opened = await real.launch();
        return opened;
      },
    });

    try {
      const err = await runScan(`${base}/slow`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: false,
        verifyFixes: false,
        onPhase: (p) => {
          if (p === "loading") {
            setTimeout(() => void opened?.close().catch(() => undefined), SLOW_DELAY_MS / 4);
          }
        },
      }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ScanFailure);
      expect((err as ScanFailure).code).toBe("browser-unavailable");
    } finally {
      setBrowserExecutor(real);
      await closeSharedBrowser();
    }
  }, 60_000);

  it("keeps the stylesheet-dependent rules working under the resource policy", async () => {
    const result = await runScan(`${base}/broken`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });

    expect(result.violations.map((v) => v.id)).toContain("color-contrast");
  }, 60_000);

  it("audits content that only appears after the page renders", async () => {
    const result = await runScan(`${base}/dynamic`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });

    const ids = result.violations.map((v) => v.id);
    expect(ids).toContain("image-alt");
    expect(ids).toContain("button-name");
  }, 60_000);

  it("finishes an extremely tall document and still reports", async () => {
    const result = await runScan(`${base}/tall`, {
      screenshot: true,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });

    expect(result.violations.map((v) => v.id)).toContain("image-alt");
    expect(result.scannedElements).toBeGreaterThan(0);
  }, 60_000);

  it("does not wait on a subresource that never responds", async () => {
    const started = Date.now();
    const result = await runScan(`${base}/stuck-asset`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });

    expect(Date.now() - started).toBeLessThan(20_000);
    expect(result.title).toBe("Stuck asset fixture");
  }, 60_000);

  it("reports a navigation timeout as its own failure instead of a generic one", async () => {
    const err = await runScan(`${base}/hangs-forever`, {
      budgetMs: 4_000,
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScanFailure);
    expect((err as ScanFailure).code).toBe("navigation-timeout");
  }, 60_000);

  it("delivers a partial report instead of a timeout when the budget runs short", async () => {
    const result = await runScan(`${base}/slow`, {
      budgetMs: SLOW_DELAY_MS + 3_800,
      screenshot: false,
      keyboard: true,
      contexts: true,
      audits: true,
      verifyFixes: true,
    });

    expect(result.partial).toBe(true);
    expect(result.violations.map((v) => v.id)).toContain("image-alt");
    expect(result.counts.passed).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);

    const codes = result.warnings?.map((w) => w.code) ?? [];
    expect(codes).toContain("keyboard-skipped");
    expect(codes).toContain("contexts-skipped");
    expect(result.keyboard).toBeUndefined();
    expect(result.contexts).toBeUndefined();
  }, 60_000);

  it("every warning names a stage that really did not run", async () => {
    const result = await runScan(`${base}/slow`, {
      budgetMs: SLOW_DELAY_MS + 3_800,
      screenshot: true,
      keyboard: true,
      contexts: true,
      audits: true,
      verifyFixes: true,
    });

    const codes = new Set(result.warnings?.map((w) => w.code) ?? []);

    expect(codes.has("keyboard-skipped")).toBe(result.keyboard === undefined);
    expect(codes.has("contexts-skipped")).toBe(result.contexts === undefined);
    expect(codes.has("audits-skipped")).toBe(result.audits === undefined);
    expect(codes.has("screenshot-unavailable")).toBe(result.screenshot === null);

    for (const w of result.warnings ?? []) expect(w.message.length).toBeGreaterThan(0);
  }, 60_000);

  it("still fails when not even the essential audit could be collected", async () => {
    const err = await runScan(`${base}/slow`, {
      budgetMs: SLOW_DELAY_MS + 600,
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ScanFailure);
    expect((err as ScanFailure).code).toBe("audit-failed");
  }, 60_000);

  it("delivers the full report when the preview is switched off", async () => {
    const result = await runScan(`${base}/broken`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });

    expect(result.screenshot).toBeNull();
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.warnings?.map((w) => w.code) ?? []).not.toContain("screenshot-unavailable");
  }, 60_000);

  it("drops the preview before the audit when the budget runs short", async () => {
    const result = await runScan(`${base}/slow`, {
      budgetMs: SLOW_DELAY_MS + 2_400,
      screenshot: true,
      keyboard: true,
      contexts: true,
      audits: true,
      verifyFixes: true,
    });

    expect(result.violations.map((v) => v.id)).toContain("image-alt");
    expect(result.screenshot).toBeNull();
    expect(result.warnings?.map((w) => w.code)).toContain("screenshot-unavailable");
    expect(result.partial).toBe(true);
  }, 60_000);

  it("reports timings for every stage it ran", async () => {
    let timings: Record<string, number> = {};
    await runScan(`${base}/clean`, {
      screenshot: true,
      keyboard: false,
      contexts: false,
      audits: false,
      verifyFixes: false,
      onTimings: (t) => {
        timings = t;
      },
    });

    for (const stage of [
      "browserLaunch",
      "contextCreate",
      "pageCreate",
      "navigation",
      "contentReady",
      "axe",
      "screenshot",
      "total",
    ]) {
      expect(timings[stage]).toBeGreaterThanOrEqual(0);
    }
  }, 60_000);
});

describe("score and counts cover this project's own rules", () => {
  const audit = () =>
    runScan(`${base}/own-rules-only`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      verifyFixes: false,
    });

  it("never reports a clean page when an own rule failed", async () => {
    const result = await audit();

    expect(result.violations).toEqual([]);

    const own = result.audits?.liveRegions?.findings ?? [];
    expect(own).toHaveLength(1);
    expect(own[0].severity).toBe("serious");

    expect(result.counts.serious).toBe(1);
    expect(result.score).toBeLessThan(100);
    expect(result.summary).not.toContain("Excellent");
  });

  it("counts one violated rule while naming every element it hit", async () => {
    const result = await audit();

    expect(result.counts.serious).toBe(1);
    expect(result.audits!.liveRegions!.findings[0].count).toBe(2);
  });

  it("does not call a complete hosted reading partial", async () => {
    const result = await runScan(`${base}/clean`);

    expect(result.partial).toBeFalsy();
    expect(result.warnings ?? []).toEqual([]);
    expect(result.summary).not.toContain("checks that ran");
  });

  it("charges a rule once when axe reports it too", async () => {
    const result = await runScan(`${base}/audits`, {
      screenshot: false,
      keyboard: false,
      contexts: false,
      verifyFixes: false,
    });

    const scored = scoredViolations(result);
    const ids = scored.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("what the keyboard pass concludes about reading order", () => {
  const orderFindingOf = async (path: string) => {
    const result = await runScan(`${base}${path}`, {
      screenshot: false,
      keyboard: true,
      contexts: false,
      audits: false,
      verifyFixes: false,
    });
    return {
      result,
      order: result.keyboard?.findings.find((f) => f.id === "focus-order"),
    };
  };

  it("a list that only scrolls inside its own container is not out of sequence", async () => {
    const { result, order } = await orderFindingOf("/scroller");

    expect(result.keyboard?.focusPath.length).toBeGreaterThan(SCROLL_ROWS);
    expect(order).toBeUndefined();
  }, 90_000);

  it("a row painted in reverse is still reported", async () => {
    const { order } = await orderFindingOf("/inverted");

    expect(order?.count).toBe(1);
    expect(order?.occurrences[0].reason).toContain("back to the left");
  }, 90_000);

  it("the scrolled list does not lose its stops to the correction", async () => {
    const { result } = await orderFindingOf("/scroller");
    const labels = result.keyboard?.focusPath.map((s) => s.label) ?? [];

    expect(labels).toContain("Row 0");
    expect(labels).toContain(`Save ${SCROLL_ROWS - 1}`);
  }, 90_000);
});
