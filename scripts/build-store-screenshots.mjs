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

const cover = (bg, ink, band) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 168'%3E%3Crect width='120' height='168' fill='%23${bg}'/%3E%3Crect x='0' y='0' width='14' height='168' fill='%23${ink}'/%3E%3Crect x='28' y='28' width='68' height='9' rx='2' fill='%23${band}'/%3E%3Crect x='28' y='44' width='46' height='9' rx='2' fill='%23${band}'/%3E%3Ccircle cx='62' cy='104' r='26' fill='%23${ink}' opacity='.22'/%3E%3Crect x='28' y='140' width='34' height='6' rx='3' fill='%23${ink}' opacity='.5'/%3E%3C/svg%3E`;

const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Northwind Books — staff picks</title>
<style>
  :root { color-scheme: light }
  * { box-sizing: border-box }
  body { margin:0; font:16px/1.55 ui-sans-serif,system-ui,sans-serif; color:#1d1b16; background:#fffdf7 }
  header { display:flex; align-items:center; gap:20px; padding:14px 28px; background:#14342b; color:#f4efe2 }
  header strong { font-size:18px; letter-spacing:-.01em }
  nav { display:flex; gap:18px; margin-left:8px }
  nav a { color:#f4efe2; text-decoration:none; font-size:14.5px }
  nav a.plain { outline:none }
  .spacer { margin-left:auto; display:flex; align-items:center; gap:10px }
  .search { font:inherit; font-size:14px; padding:7px 10px; border:1px solid #2f5b4c; background:#0f281f; color:#f4efe2; width:170px }
  .search::placeholder { color:#7f9a8e }
  .cart { width:18px; height:18px; padding:0; border:0; background:#c4622d; border-radius:3px }
  .hero { padding:28px 28px 26px; background:linear-gradient(180deg,#f8f1de,#fffdf7); border-bottom:1px solid #e8dfc7 }
  .hero h1 { font-size:31px; line-height:1.08; margin:0 0 10px; max-width:15ch; letter-spacing:-.02em }
  .hero p { margin:0 0 18px; max-width:46ch; font-size:16.5px; color:#4a463c }
  .cta { display:flex; gap:10px; align-items:center }
  button { font:inherit; font-size:15px; padding:10px 18px; border:1px solid #14342b; background:#14342b; color:#f4efe2; cursor:pointer }
  button.ghost { background:transparent; color:#14342b }
  button.ghost.plain { outline:none }
  main { padding:26px 28px 8px }
  h3 { font-size:20px; margin:0 0 4px; letter-spacing:-.01em }
  .muted { color:#a09a8a }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin:18px 0 4px }
  .card { border:1px solid #e8dfc7; background:#fff; padding:14px }
  .card img { display:block; width:100%; height:146px; object-fit:cover; object-position:top; border:1px solid #efe7d3 }
  .card h4 { font-size:15px; margin:12px 0 2px; line-height:1.3 }
  .by { font-size:13px; margin:0 0 8px }
  .price { font-weight:600; font-size:15px }
  .stars { color:#c4622d; font-size:13px; letter-spacing:1px }
  .buy { width:100%; margin-top:10px; padding:8px; font-size:14px }
  .signup { margin:26px 0 8px; padding:20px; background:#14342b; color:#f4efe2; display:flex; gap:14px; align-items:end; flex-wrap:wrap }
  .signup h4 { margin:0 0 2px; font-size:17px }
  .signup p { margin:0; font-size:13.5px; color:#8fa79b }
  .signup input { font:inherit; font-size:14.5px; padding:9px 11px; border:1px solid #2f5b4c; background:#0f281f; color:#f4efe2; width:230px }
  .signup button { background:#c4622d; border-color:#c4622d; color:#fffdf7 }
  footer { margin-top:22px; padding:20px 28px 26px; border-top:1px solid #e8dfc7; color:#c0b9a6; font-size:13.5px }
</style></head><body>
<header>
  <strong>Northwind Books</strong>
  <nav>
    <a href="/catalogue">Catalogue</a>
    <a href="/offers" class="plain">Offers</a>
    <a href="/events">Events</a>
  </nav>
  <span class="spacer">
    <input class="search" type="search" aria-label="Search the catalogue" placeholder="Search titles">
    <button class="cart"></button>
  </span>
</header>

<div class="hero">
  <h1>Books chosen by people who read them.</h1>
  <p>Every title on this shelf was picked and written up by a bookseller who finished it first.</p>
  <span class="cta">
    <button>Browse staff picks</button>
    <button class="ghost plain">Gift a membership</button>
  </span>
</div>

<main>
  <h3>This month on the table</h3>
  <p class="muted">Twelve titles, restocked weekly.</p>

  <div class="grid">
    <div class="card">
      <img src="${cover("d9c9a3", "14342b", "fffdf7")}" alt="Cover of The Salt Path">
      <h4>The Salt Path</h4>
      <p class="by muted">Raynor Winn</p>
      <p class="stars">★★★★☆</p>
      <span class="price">£9.99</span>
      <button class="buy">Add to basket</button>
    </div>
    <div class="card">
      <img src="${cover("c4622d", "3a1a0c", "ffe9d6")}">
      <h4>Piranesi</h4>
      <p class="by muted">Susanna Clarke</p>
      <p class="stars">★★★★★</p>
      <span class="price">£8.50</span>
      <button class="buy">Add to basket</button>
    </div>
    <div class="card">
      <img src="${cover("2f5b4c", "0f281f", "d9e8e0")}" alt="Cover of Small Things Like These">
      <h4>Small Things Like These</h4>
      <p class="by muted">Claire Keegan</p>
      <p class="stars">★★★★☆</p>
      <span class="price">£7.25</span>
      <button class="buy">Add to basket</button>
    </div>
  </div>

  <div class="signup">
    <span>
      <h4>The Thursday letter</h4>
      <p>One bookseller, one book, every week.</p>
    </span>
    <span class="spacer">
      <label for="email" style="display:block;font-size:13px;margin-bottom:4px">Email</label>
      <input id="email" name="email" type="email" placeholder="you@example.com">
    </span>
    <button>Subscribe</button>
  </div>
</main>
<footer>Prices include VAT. Free delivery over £25.</footer>
</body></html>`;

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
  await sw.evaluate(() => chrome.storage.local.set({ locale: "en" }));

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
      const target = [...document.querySelectorAll("span, h2, h3, h4, summary")].find((el) =>
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
  const stop = await panel.evaluate(async () => {
    const next = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Next stop",
    );
    for (let i = 0; i < 7; i += 1) {
      next?.click();
      await new Promise((r) => setTimeout(r, 260));
    }
    document
      .getElementById("focus-heading")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollBy(0, -56);
    await new Promise((r) => setTimeout(r, 400));
    return document.querySelector('[aria-live="polite"].min-w-24')?.textContent ?? null;
  });
  console.log("  focus stop:", stop);
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
