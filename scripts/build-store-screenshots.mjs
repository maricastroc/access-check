import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { sideBySide } from "./png-compose.mjs";

const WIDTH = 1280;
const HEIGHT = 800;
const PANEL = 400;
const ZOOM = 1.25;
const PAGE_CSS = { width: (WIDTH - PANEL) / ZOOM, height: HEIGHT / ZOOM };
const PANEL_CSS = { width: PANEL / ZOOM, height: HEIGHT / ZOOM };
const OUT = join(process.cwd(), "store/screenshots");
const SITE = "https://northwind.example/";

const cover = (bg, ink, band) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168"><rect width="120" height="168" fill="#${bg}"/><rect x="0" y="0" width="14" height="168" fill="#${ink}"/><rect x="28" y="28" width="68" height="9" rx="2" fill="#${band}"/><rect x="28" y="44" width="46" height="9" rx="2" fill="#${band}"/><circle cx="62" cy="104" r="26" fill="#${ink}" opacity=".22"/><rect x="28" y="140" width="34" height="6" rx="3" fill="#${ink}" opacity=".5"/></svg>`;

const shelf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 190"><rect width="300" height="190" fill="#efe3c4"/><rect x="0" y="160" width="300" height="30" fill="#14342b"/><rect x="34" y="52" width="30" height="108" fill="#c4622d"/><rect x="68" y="34" width="26" height="126" fill="#2f5b4c"/><rect x="98" y="62" width="34" height="98" fill="#d9c9a3"/><rect x="136" y="44" width="24" height="116" fill="#3a1a0c"/><rect x="164" y="70" width="38" height="90" fill="#8fa79b"/><rect x="206" y="40" width="28" height="120" fill="#c4622d" opacity=".8"/><rect x="238" y="58" width="30" height="102" fill="#14342b" opacity=".85"/></svg>`;

const FILES = {
  "/covers/the-salt-path.svg": cover("d9c9a3", "14342b", "fffdf7"),
  "/covers/piranesi.svg": cover("c4622d", "3a1a0c", "ffe9d6"),
  "/covers/small-things-like-these.svg": cover("2f5b4c", "0f281f", "d9e8e0"),
  "/art/shelf.svg": shelf,
};

const heart = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="#14342b" stroke-width="2"/></svg>`;
const bag = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M6 8h12l-1 12H7L6 8zm3 0a3 3 0 0 1 6 0" fill="none" stroke="#f4efe2" stroke-width="2"/></svg>`;

const card = (slug, title, author, stars, price, alt) => `
    <div class="card">
      <span class="art">
        <img src="/covers/${slug}.svg"${alt ? ` alt="${alt}"` : ""}>
        <a class="save" href="/wishlist/${slug}">${heart}</a>
      </span>
      <h4>${title}</h4>
      <p class="by muted">${author}</p>
      <p class="stars">${stars}</p>
      <span class="price">${price}</span>
      <button class="buy">Add to basket</button>
    </div>`;

const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Northwind Books, staff picks</title>
<style>
  :root { color-scheme: light }
  * { box-sizing: border-box }
  body { margin:0; font:16px/1.55 ui-sans-serif,system-ui,sans-serif; color:#1d1b16; background:#fffdf7 }
  header { display:flex; align-items:center; gap:20px; padding:12px 28px; background:#14342b; color:#f4efe2 }
  header strong { font-size:18px; letter-spacing:-.01em }
  nav { display:flex; gap:18px; margin-left:8px }
  nav a { color:#f4efe2; text-decoration:none; font-size:14.5px }
  nav a.plain { outline:none }
  .spacer { margin-left:auto; display:flex; align-items:center; gap:10px }
  .search { font:inherit; font-size:14px; padding:7px 10px; border:1px solid #2f5b4c; background:#0f281f; color:#f4efe2; width:170px }
  .search::placeholder { color:#7f9a8e }
  .cart { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; padding:0; border:1px solid #2f5b4c; background:#0f281f }
  .hero { display:grid; grid-template-columns: 1fr 300px; gap:28px; align-items:center; padding:26px 28px 22px; background:linear-gradient(180deg,#f8f1de,#fffdf7); border-bottom:1px solid #e8dfc7 }
  .hero h1 { font-size:31px; line-height:1.08; margin:0 0 10px; max-width:15ch; letter-spacing:-.02em }
  .hero p { margin:0 0 18px; max-width:42ch; font-size:16.5px; color:#4a463c }
  .hero figure { margin:0 }
  .hero figure img { display:block; width:300px; height:170px; object-fit:cover; border:1px solid #e8dfc7 }
  .dots { display:flex; gap:6px; justify-content:center; margin-top:10px }
  .dot { width:10px; height:10px; padding:0; border:1px solid #14342b; border-radius:50%; background:transparent }
  .dot[aria-current] { background:#14342b }
  .cta { display:flex; gap:10px; align-items:center }
  button { font:inherit; font-size:15px; padding:10px 18px; border:1px solid #14342b; background:#14342b; color:#f4efe2; cursor:pointer }
  button.ghost { background:transparent; color:#14342b }
  button.ghost.plain { outline:none }
  main { padding:22px 28px 8px }
  .row { display:flex; align-items:end; justify-content:space-between; gap:16px }
  h3 { font-size:20px; margin:0 0 2px; letter-spacing:-.01em }
  .row p { margin:0 }
  .sort { font:inherit; font-size:14px; padding:7px 10px; border:1px solid #cfc3a3; background:#fff; color:#1d1b16 }
  .muted { color:#a09a8a }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin:16px 0 4px }
  .card { border:1px solid #e8dfc7; background:#fff; padding:14px }
  .art { position:relative; display:block }
  .card img { display:block; width:100%; height:146px; object-fit:cover; object-position:top; border:1px solid #efe7d3 }
  .save { position:absolute; top:8px; right:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:#fffdf7; border:1px solid #e8dfc7 }
  .card h4 { font-size:15px; margin:12px 0 2px; line-height:1.3 }
  .by { font-size:13px; margin:0 0 8px }
  .price { font-weight:600; font-size:15px }
  .stars { color:#c4622d; font-size:13px; letter-spacing:1px; margin:0 0 4px }
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
    <button class="cart">${bag}</button>
  </span>
</header>

<div class="hero">
  <div>
    <h1>Books chosen by people who read them.</h1>
    <p>Every title on this shelf was picked and written up by a bookseller who finished it first.</p>
    <span class="cta">
      <button>Browse staff picks</button>
      <button class="ghost plain">Gift a membership</button>
    </span>
  </div>
  <figure>
    <img src="/art/shelf.svg" alt="A shelf of this month's staff picks">
    <div class="dots">
      <button class="dot" aria-label="Slide 1" aria-current="true"></button>
      <button class="dot" aria-label="Slide 2"></button>
      <button class="dot" aria-label="Slide 3"></button>
    </div>
  </figure>
</div>

<main>
  <div class="row">
    <span>
      <h3>This month on the table</h3>
      <p class="muted">Twelve titles, restocked weekly.</p>
    </span>
    <select class="sort">
      <option>Most loved</option>
      <option>Newest</option>
      <option>Price, low to high</option>
    </select>
  </div>

  <div class="grid">${card("the-salt-path", "The Salt Path", "Raynor Winn", "★★★★☆", "£9.99", "Cover of The Salt Path")}${card("piranesi", "Piranesi", "Susanna Clarke", "★★★★★", "£8.50", "")}${card("small-things-like-these", "Small Things Like These", "Claire Keegan", "★★★★☆", "£7.25", "Cover of Small Things Like These")}
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
  deviceScaleFactor: ZOOM,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

await ctx.route(`${SITE}**`, (route) => {
  const art = FILES[new URL(route.request().url()).pathname];
  return art
    ? route.fulfill({ status: 200, contentType: "image/svg+xml", body: art })
    : route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FIXTURE });
});

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) {
  if (file.endsWith(".png")) rmSync(join(OUT, file));
}
const made = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = sw.url().split("/")[2];
  await sw.evaluate(() => chrome.storage.local.set({ locale: "en" }));

  const page = await ctx.newPage();
  await page.setViewportSize(PAGE_CSS);
  await page.goto(SITE, { waitUntil: "load" });
  await page.bringToFront();

  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab);
    await new Promise((r) => setTimeout(r, 700));
  });

  const panel = await ctx.newPage();
  await panel.setViewportSize(PANEL_CSS);
  await panel.goto(`chrome-extension://${extId}/panel.html`);
  const ready = async () => {
    await panel.waitForFunction(() => document.getElementById("group-fix") !== null, null, {
      timeout: 20000,
    });
    await wait(700);
  };
  await ready();

  const compose = async (name, caption) => {
    await page.bringToFront();
    await page.setViewportSize({ width: PAGE_CSS.width + 1, height: PAGE_CSS.height });
    await page.setViewportSize(PAGE_CSS);
    await wait(400);
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
    made.push(`${name}.png: ${caption}`);
  };

  const onPage = () =>
    page.evaluate(() => {
      const root = document.getElementById("accesscheck-overlay")?.shadowRoot;
      return [...(root?.querySelectorAll(".tag") ?? [])]
        .filter((tag) => tag.style.display !== "none")
        .map((tag) => ({
          text: tag.textContent,
          current: tag.classList.contains("current"),
          badge: tag.classList.contains("badge"),
          alert: tag.dataset.alert ?? null,
        }));
    });

  const scrollPanelTo = (needle) =>
    panel.evaluate(async (text) => {
      const open = document.querySelector('h3 > button[aria-expanded="true"]')?.closest("li");
      const target = [...(open ?? document).querySelectorAll("*")].find(
        (el) => el.children.length === 0 && el.textContent.trim() === text,
      );
      if (!target) throw new Error(`the panel shows no "${text}"`);
      target.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy(0, -56);
      await new Promise((r) => setTimeout(r, 200));
    }, needle);

  const press = (label) =>
    panel.evaluate(async (text) => {
      const control = [...document.querySelectorAll("button, label")].find(
        (b) => b.textContent.trim() === text,
      );
      if (!control) throw new Error(`the panel has no "${text}"`);
      control.click();
      await new Promise((r) => setTimeout(r, 500));
    }, label);

  const toggleFinding = (key) =>
    panel.evaluate(async (id) => {
      const item = document.getElementById(`finding-${id}`);
      if (!item) throw new Error(`no finding ${id} in the panel`);
      item.closest("details")?.setAttribute("open", "");
      item.querySelector("h3 > button").click();
      await new Promise((r) => setTimeout(r, 500));
    }, key);

  const overview = await onPage();
  console.log("  overview:", overview.map((m) => m.text).join(" "));
  if (overview.length < 5 || overview.some((m) => m.current || m.text.includes("·"))) {
    throw new Error(
      `2-overview: the page does not show one mark per finding: ${JSON.stringify(overview)}`,
    );
  }
  await compose("2-overview", "every finding to fix, marked on the page under its number");

  await toggleFinding("wcag:color-contrast");
  const tested = await panel.evaluate(
    () =>
      document.querySelector('[id="finding-wcag:color-contrast"] [data-chain-end="tested"]') !==
      null,
  );
  if (!tested) throw new Error("3-verified-fix: the contrast fix is not marked as tested");
  const inView = (await onPage()).find((m) => !m.current && !m.badge);
  if (inView) {
    await panel.evaluate(async (tag) => {
      const chip = [...document.querySelectorAll('section[id^="investigation-"] button')].find(
        (b) => b.textContent.trim() === tag,
      );
      chip?.click();
      await new Promise((r) => setTimeout(r, 600));
    }, inView.text);
  }
  await scrollPanelTo("Measured");
  await compose("3-verified-fix", "a contrast fix measured, changed and tested on the page");
  await toggleFinding("wcag:color-contrast");

  await page.bringToFront();
  await sw.evaluate(async () => {
    await globalThis.__accessCheckDeepAudit();
    await new Promise((r) => setTimeout(r, 900));
  });
  await panel.reload();
  await ready();

  await press("Inspect tab order");
  for (let i = 0; i < 6; i += 1) {
    await panel.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.getAttribute("aria-label") === "Next stop")
        ?.click(),
    );
    await wait(260);
  }
  await press("Show complete path");
  await panel.evaluate(async () => {
    document
      .getElementById("focus-heading")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollBy(0, -56);
    await new Promise((r) => setTimeout(r, 400));
  });
  const path = await onPage();
  const badges = path.filter((m) => m.badge);
  console.log(
    "  focus path:",
    JSON.stringify({
      stops: path.filter((m) => !m.badge).length,
      alerts: path.filter((m) => m.alert).length,
      badges,
    }),
  );
  if (badges.length !== 1) {
    throw new Error(
      `1-focus-path: only the current stop should open its finding: ${JSON.stringify(badges)}`,
    );
  }
  await compose("1-focus-path", "the real tab order, and the stops where it meets a finding");
} finally {
  await ctx.close();
}

console.log(made.join("\n"));
