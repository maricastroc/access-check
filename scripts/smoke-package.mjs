import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const SOURCE = resolve(process.argv[2] ?? "extension/dist");

const EXT = mkdtempSync(join(tmpdir(), "ac-smoke-"));
cpSync(SOURCE, EXT, { recursive: true });
const manifestPath = join(EXT, "manifest.json");
const shipped = JSON.parse(readFileSync(manifestPath, "utf8"));
writeFileSync(
  manifestPath,
  JSON.stringify({ ...shipped, host_permissions: ["<all_urls>"] }, null, 2),
);

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Smoke fixture</title>
<style>
  body { font: 16px system-ui; background: #ffffff; color: #1a1a1a }
  .faint { color: #b4b4b4; background: #ffffff }
  .ghost:focus { outline: none }
</style></head>
<body><main><h1>Smoke fixture</h1>
<nav aria-label="Primary"><a href="/docs/start">Get started</a></nav>
<p class="faint">Low contrast paragraph one.</p>
<p class="faint">Low contrast paragraph two.</p>
<img src="/cover.png">
<button class="badge"></button>
<a class="ghost" href="/plain">No focus ring</a>
<button>Ordinary</button>
</main></body></html>`;

const server = createServer((_q, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, "localhost", r));
const origin = `http://localhost:${server.address().port}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-smoke-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const out = {};

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = sw.url().split("/")[2];

  out.manifest = await sw.evaluate(async () => {
    const m = chrome.runtime.getManifest();
    return {
      name: m.name,
      version: m.version,
      permissions: [...m.permissions].sort(),
      hostPermissions: m.host_permissions ?? null,
      optional: m.optional_permissions ?? null,
      granted: (await chrome.permissions.getAll()).permissions.sort(),
    };
  });

  await sw.evaluate(() => {
    globalThis.__smokeDebugger = [];
    for (const call of ["attach", "detach"]) {
      const real = chrome.debugger[call].bind(chrome.debugger);
      chrome.debugger[call] = (...args) => {
        globalThis.__smokeDebugger.push(call);
        return real(...args);
      };
    }
  });

  const page = await ctx.newPage();
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await sw.evaluate(() => chrome.storage.local.set({ locale: "en" }));

  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab);
    await new Promise((r) => setTimeout(r, 700));
  });

  out.debuggerDuringAudit = await sw.evaluate(() => globalThis.__smokeDebugger.slice());

  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: 400, height: 760 });
  await panel.goto(`chrome-extension://${extId}/panel.html`);
  await panel.waitForFunction(() => document.body.textContent.includes("Findings"), null, {
    timeout: 20000,
  });

  const readFindings = () =>
    panel.evaluate(async () => {
      const rows = [...document.querySelectorAll("button")].filter((b) => b.querySelector("h3"));
      const seen = [];
      for (const row of rows) {
        row.click();
        await new Promise((r) => setTimeout(r, 120));
        const text = row.parentElement.innerText;
        const element =
          text
            .split(/^ELEMENT$/m)[1]
            ?.split(/^[A-Z ]{4,}$/m)[0]
            ?.trim() ?? null;
        seen.push({
          rule: (row.innerText.match(/\n([a-z][a-z0-9-]+)\n/) ?? [])[1] ?? null,
          cue: /verified in sandbox|needs review/.test(row.innerText),
          section: /VERIFICATION RESULT/.test(text),
          seal: (text.match(/VERIFICATION RESULT\n\S\s*(.+)/) ?? [])[1] ?? null,
          element: element ? element.split("\n").map((l) => l.trim()) : null,
        });
        row.click();
        await new Promise((r) => setTimeout(r, 60));
      }
      return seen;
    });

  out.findings = await readFindings();

  out.zoom = await panel.evaluate(async () => {
    const results = [];
    for (const width of [320, 400]) {
      document.documentElement.style.zoom = "200%";
      window.resizeTo?.(width, 760);
      await new Promise((r) => setTimeout(r, 120));
      const doc = document.documentElement;
      results.push({ width, overflow: doc.scrollWidth - doc.clientWidth });
    }
    document.documentElement.style.zoom = "";
    return results;
  });

  out.locale = {};
  out.locale.en = await panel.evaluate(() => document.body.innerText.slice(0, 80));
  await sw.evaluate(() => chrome.storage.local.set({ locale: "pt-BR" }));
  await panel.reload();
  await panel.waitForFunction(
    () => /Problemas|Achados|Findings/.test(document.body.textContent),
    null,
    {
      timeout: 20000,
    },
  );
  out.locale.pt = await panel.evaluate(() => document.body.innerText.slice(0, 80));
  out.locale.ptHasEnglish = await panel.evaluate(() =>
    /Verified fix|Needs review|Best practice, not a WCAG/.test(document.body.innerText),
  );
  await sw.evaluate(() => chrome.storage.local.set({ locale: "en" }));
  await panel.reload();
  await panel.waitForFunction(() => document.body.textContent.includes("Findings"), null, {
    timeout: 20000,
  });

  await sw.evaluate(async () => {
    globalThis.__smokeDebugger.length = 0;
    await globalThis.__accessCheckDeepAudit();
    await new Promise((r) => setTimeout(r, 900));
  });

  out.debuggerDuringWalk = await sw.evaluate(() => globalThis.__smokeDebugger.slice());
  out.tabFreeAfterWalk = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.debugger.attach({ tabId: tab.id }, "1.3");
      await chrome.debugger.detach({ tabId: tab.id });
      return true;
    } catch (e) {
      return String(e instanceof Error ? e.message : e);
    }
  });

  await panel.reload();
  await panel.waitForFunction(() => document.body.textContent.includes("Focus path"), null, {
    timeout: 20000,
  });

  out.walk = await panel.evaluate(() => {
    const text = document.body.innerText;
    return {
      stops: (text.match(/(\d+) stops/) ?? [])[1] ?? null,
      section: /FOCUS PATH/.test(text),
    };
  });

  const located = await panel.evaluate(async () => {
    const rows = [...document.querySelectorAll("button")].filter((b) => b.querySelector("h3"));
    const row = rows.find((b) => /focus|keyboard|reach/i.test(b.textContent));
    if (!row) return { opened: false };
    row.click();
    await new Promise((r) => setTimeout(r, 400));
    const panelText = row.parentElement.innerText;
    const lines = panelText.split("\n").map((l) => l.trim());
    const at = lines.findIndex((l) => l === "ELEMENT");
    const selector = lines.slice(at + 1).find((l) => l.length > 0) ?? null;
    const where = lines.find((l) => /^Stop \d+ \u00b7 /.test(l)) ?? null;

    let copied = null;
    navigator.clipboard.writeText = async (value) => {
      copied = value;
    };
    const copy = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Copy selector",
    );
    copy?.click();
    await new Promise((r) => setTimeout(r, 200));

    const locate = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Locate on page",
    );
    locate?.click();
    await new Promise((r) => setTimeout(r, 900));

    return { opened: true, selector, where, copied, clickedLocate: Boolean(locate) };
  });
  out.locate = located;

  out.overlayOnPage = await page.evaluate((selector) => {
    const marks = document.querySelectorAll('[class*="accesscheck"], [id*="accesscheck"]');
    let matches = null;
    try {
      matches = selector ? document.querySelectorAll(selector).length : null;
    } catch {
      matches = "invalid";
    }
    return { overlayNodes: marks.length, selectorMatches: matches };
  }, located.selector);
} finally {
  await ctx.close();
  server.close();
}

console.log(JSON.stringify(out, null, 2));
