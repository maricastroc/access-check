import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runScan } from "./scan";
import { closeSharedBrowser } from "./browser";

const PAGES: Record<string, { status?: number; html: string }> = {
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
};

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const page = PAGES[req.url ?? ""];
    if (!page) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.statusCode = page.status ?? 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(page.html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await closeSharedBrowser();
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("runScan (integration — real browser)", () => {
  it(
    "detects known violations and proves fixes by re-running axe on the DOM",
    async () => {
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
    },
    60_000,
  );

  it(
    "emits progress phases in order for streaming",
    async () => {
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
    },
    60_000,
  );

  it(
    "emits a core result before the deep passes, full result after",
    async () => {
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
    },
    60_000,
  );

  it(
    "aborts with an HTTP message when the page responds 4xx",
    async () => {
      await expect(runScan(`${base}/gone`)).rejects.toThrow(/HTTP 404/);
    },
    60_000,
  );

  it(
    "an accessible page produces no WCAG violation and scores high",
    async () => {
      const result = await runScan(`${base}/clean`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: false,
        verifyFixes: false,
      });
      expect(result.counts.critical).toBe(0);
      expect(result.score).toBeGreaterThan(90);
    },
    60_000,
  );

  it(
    "own detection engine flags what axe misses (target size, motion, live region)",
    async () => {
      const result = await runScan(`${base}/audits`, {
        screenshot: false,
        keyboard: false,
        contexts: false,
        audits: true,
        verifyFixes: false,
      });

      const a = result.audits;
      expect(a).toBeDefined();

      const target = a?.targetSize?.findings.find((f) => f.id === "target-size");
      expect(target?.count).toBe(2);

      const motion = a?.reducedMotion?.findings.find((f) => f.id === "reduced-motion");
      expect(motion?.selectors).toContain("#spinner");

      const live = a?.liveRegions?.findings.find((f) => f.id === "live-region-hidden");
      expect(live?.count).toBe(1);

      expect(typeof result.score).toBe("number");
    },
    60_000,
  );
});
