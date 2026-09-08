import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { sideBySide } from "./png-compose.mjs";

const WIDTH = 1280;
const HEIGHT = 800;
const PANEL = 400;
const OUT = join(process.cwd(), "store/screenshots");
const SITE = "https://northwind.example/";

const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Northwind Books — checkout</title>
<style>
  :root { color-scheme: light }
  body { margin:0; font:16px/1.5 ui-sans-serif,system-ui,sans-serif; color:#17181a; background:#fcfbf8 }
  header { display:flex; gap:24px; align-items:center; padding:18px 32px; border-bottom:1px solid #e6e2d8 }
  nav a { color:#17181a; margin-right:18px; text-decoration:none }
  main { padding:32px; max-width:720px }
  h1 { font-size:30px; margin:0 0 8px }
  .muted { color:#9c9689 }
  .row { display:flex; gap:12px; margin:20px 0 }
  button { font:inherit; padding:10px 18px; border:1px solid #17181a; background:#17181a; color:#fcfbf8 }
  button.ghost { background:transparent; color:#17181a }
  a.plain, button.bare { outline:none }
  label { display:block; margin:16px 0 4px }
  input { font:inherit; padding:9px 10px; border:1px solid #cfc9bb; width:280px }
  .tiny { width:18px; height:18px; padding:0; border:0; background:#e6e2d8 }
  footer { margin-top:40px; padding:24px 32px; border-top:1px solid #e6e2d8; color:#b9b3a6 }
</style></head><body>
<header>
  <strong>Northwind Books</strong>
  <nav><a href="/catalogue">Catalogue</a><a href="/offers" class="plain">Offers</a><a href="/help">Help</a></nav>
</header>
<main>
  <h1>Checkout</h1>
  <p class="muted">Two items, ready to ship.</p>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" placeholder="you@example.com">
  <label for="card">Card number</label>
  <input id="card" name="card" inputmode="numeric" placeholder="0000 0000 0000 0000">
  <div class="row">
    <button>Place order</button>
    <button class="ghost plain">Save for later</button>
    <button class="tiny bare"></button>
  </div>
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 160'%3E%3Crect width='120' height='160' fill='%23efece4'/%3E%3Crect x='10' y='10' width='100' height='140' fill='none' stroke='%23cfc9bb'/%3E%3Crect x='22' y='34' width='76' height='8' fill='%23cfc9bb'/%3E%3Crect x='22' y='50' width='52' height='8' fill='%23cfc9bb'/%3E%3C/svg%3E" width="120" height="160">
  <footer>Prices include tax.</footer>
</main></body></html>`;

const EXT = mkdtempSync(join(tmpdir(), "ac-shots-"));
cpSync(join(process.cwd(), "extension/dist"), EXT, { recursive: true });
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-shots-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

await ctx.route(`${SITE}**`, (route) =>
  route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FIXTURE }),
);

mkdirSync(OUT, { recursive: true });
const made = [];

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = sw.url().split("/")[2];

  const page = await ctx.newPage();
  await page.setViewportSize({ width: WIDTH - PANEL, height: HEIGHT });
  await page.goto(SITE, { waitUntil: "domcontentloaded" });
  await page.bringToFront();

  const audit = (deep) =>
    sw.evaluate(async (isDeep) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab, { deep: isDeep });
      await new Promise((r) => setTimeout(r, 700));
    }, deep);

  await audit(true);

  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: PANEL, height: HEIGHT });
  await panel.goto(`chrome-extension://${extId}/panel.html`);
  await panel.waitForFunction(() => document.body.textContent.includes("Findings ·"), null, {
    timeout: 20000,
  });

  const dom = await panel.evaluate(() => ({
    roots: document.querySelectorAll("#root").length,
    scoreCards: document.querySelectorAll("#score-heading").length,
    findingsHeaders: document.querySelectorAll("#findings-heading").length,
    rows: document.querySelectorAll("button h3").length,
    bodyHeight: document.body.scrollHeight,
    scripts: document.querySelectorAll("script").length,
  }));
  console.log("  panel DOM:", JSON.stringify(dom));

  const compose = async (name, caption) => {
    await page.bringToFront();
    const left = await page.screenshot({ type: "png" });
    await panel.bringToFront();
    const right = await panel.screenshot({ type: "png" });

    const shown = await panel.evaluate(() => document.body.textContent ?? "");
    const leak = shown.match(/localhost|127\.0\.0\.1|:\d{4,5}\b/);
    if (leak) throw new Error(`${name}: the panel still shows "${leak[0]}"`);
    if (!shown.includes("northwind.example")) {
      throw new Error(`${name}: the panel does not show the audited address`);
    }

    const { png, width, height } = sideBySide(left, right);
    if (width !== WIDTH || height !== HEIGHT) {
      throw new Error(`${name} came out ${width}×${height}, expected ${WIDTH}×${HEIGHT}`);
    }
    writeFileSync(join(OUT, `${name}.png`), png);
    made.push(`${name}.png — ${caption}`);
  };

  const scrollPanelTo = (needle) =>
    panel.evaluate(async (text) => {
      const target = [...document.querySelectorAll("span, h3, h4, summary")].find((el) =>
        el.textContent.trim().startsWith(text),
      );
      target?.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy(0, -56);
      await new Promise((r) => setTimeout(r, 200));
    }, needle);

  const clickPanel = (label) =>
    panel.evaluate(async (text) => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      );
      button?.click();
      await new Promise((r) => setTimeout(r, 500));
    }, label);

  await compose("1-score-and-findings", "the score, the coverage line and the findings list");

  const openedKeyboard = await panel.evaluate(async () => {
    const rows = [...document.querySelectorAll("button")].filter((b) => b.querySelector("h3"));
    const row = rows.find((b) => /KEYBOARD|Target size/i.test(b.textContent)) ?? rows[0];
    row.scrollIntoView({ block: "center", behavior: "instant" });
    row.click();
    await new Promise((r) => setTimeout(r, 350));
    return row.querySelector("h3")?.textContent ?? null;
  });
  console.log("  opened:", openedKeyboard);
  await scrollPanelTo("Occurrence");
  await compose(
    "2-occurrence",
    "a finding opened: explanation, fix, occurrence, selector, element",
  );

  await clickPanel("Locate on page");
  await scrollPanelTo("Occurrence");
  await compose("3-located-on-page", "the element highlighted on the page");

  await clickPanel("Show focus path");
  await scrollPanelTo("Focus path");
  await compose("4-focus-path", "the focus path: current stop highlighted, neighbours dimmed");

  await clickPanel("Clear overlay");
  await page.bringToFront();
  await audit(false);
  await panel.bringToFront();
  await panel.reload();
  await panel.waitForFunction(() => document.body.textContent.includes("Findings ·"), null, {
    timeout: 20000,
  });
  await compose("5-quick-audit", "the quick audit: preliminary, no debugger, no focus path");
} finally {
  await ctx.close();
}

console.log(made.join("\n"));
