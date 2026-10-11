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
import { openPanelWindow } from "./panel-window.mjs";

const WIDTH = 1280;
const HEIGHT = 800;
const MARGIN = 48;
const repo = process.cwd();
const OUT = join(repo, "store/screenshots");
const SITE = "https://northwind.example/";

const HEADLINES = {
  opening: ["An accessibility audit of the page you’re on."],
  path: ["The tab order,", "drawn on the page."],
  findings: ["Every finding, marked on the page."],
  inspection: ["What’s missing,", "and how to fix it."],
  fix: ["A contrast fix,", "tested on the page."],
};

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

const layouts = {
  opening: ({ page, panel }) => {
    const top = 172;
    const p = 1.5;
    return {
      p,
      top,
      height: HEIGHT - top,
      lead: page.width,
      side: Math.round(panel.width * p),
    };
  },
  path: ({ page, panel }) => {
    const s = WIDTH / page.width;
    const p = 1.6;
    const from = panel.strip - 14;
    return {
      s,
      p,
      cut: Math.floor((page.hero.y + page.hero.h) * s),
      side: Math.round(panel.width * p),
      excerpt: { y: from, height: panel.links + 9 - from },
    };
  },
  details: ({ page, panel }) => {
    const s = 2.25;
    const p = 1.6;
    const side = Math.round(panel.width * p);
    const lead = WIDTH - side;
    const width = lead / s;
    const caption = 129;
    const tag = (text) => page.marks.find((m) => m.text === text);
    const [, second, third] = page.covers;
    const inset = (width - second.w) / 2;
    const edge = third.x - inset;
    const save = page.saves[1];
    const upper = [Math.round((page.header.h + 16) * s)];
    upper.push(Math.round((save.y + save.h + 4 - (tag("2").y - 8)) * s));
    const heights = [...upper, HEIGHT - caption - upper[0] - upper[1]];
    const lefts = [edge, second.x - inset, edge];
    const tops = [0, tag("2").y - 8, tag("3").y - 8];
    let y = caption;
    const bands = heights.map((height, index) => {
      const band = {
        at: { x: 0, y, width: lead, height },
        crop: { x: lefts[index], y: tops[index], width, height: height / s },
      };
      y += height;
      return band;
    });
    return { s, p, side, lead, bands };
  },
  inspection: ({ page, panel }) => {
    const [, card] = page.cards;
    const s = HEIGHT / 300;
    const p = 1.5;
    const height = panel.change + 40;
    return {
      s,
      p,
      height,
      lead: Math.round((card.w + 4) * s),
      side: Math.round(panel.width * p),
      step: HEIGHT - Math.round(height * p),
      from: { x: card.x - 2, y: page.marks[0].y - 10 },
    };
  },
  fix: ({ page, panel }) => {
    const height = Math.ceil(panel.end + 12);
    const p = HEIGHT / height;
    const [sample] = panel.samples;
    const bracket = page.muted.y - 5;
    const s = (HEIGHT - sample.top * p) / (page.buy.y - 4 - bracket);
    return {
      s,
      p,
      height,
      lead: WIDTH - Math.round(panel.width * p),
      top: Math.round(sample.top * p - 4 * s),
      from: bracket - 4,
      bar: Math.round(panel.bar * p),
    };
  },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const gather = async () => {
  const EXT = mkdtempSync(join(tmpdir(), "ac-shots-"));
  cpSync(join(repo, "extension/dist"), EXT, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
  manifest.host_permissions = ["<all_urls>"];
  writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-shots-p-")), {
    channel: "chromium",
    headless: true,
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  await ctx.route(`${SITE}**`, (route) => {
    const art = FILES[new URL(route.request().url()).pathname];
    return art
      ? route.fulfill({ status: 200, contentType: "image/svg+xml", body: art })
      : route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FIXTURE });
  });

  const images = {};
  const capture = async (target, metrics, clip) => {
    const cdp = await ctx.newCDPSession(target);
    await cdp.send("Emulation.setDeviceMetricsOverride", { ...metrics, mobile: false });
    await target.waitForFunction(
      ([width, height]) => innerWidth === width && innerHeight === height,
      [metrics.width, metrics.height],
    );
    await target.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    await wait(700);
    const top = await target.evaluate(() => scrollY);
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...clip, y: top + clip.y, scale: 1 },
    });
    await cdp.detach();
    return Buffer.from(shot.data, "base64");
  };

  try {
    let [sw] = ctx.serviceWorkers();
    if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
    await sw.evaluate(() => chrome.storage.local.set({ locale: "en" }));

    const page = await ctx.newPage();
    await page.setViewportSize({ width: 704, height: 640 });
    await page.goto(SITE, { waitUntil: "load" });
    await page.bringToFront();
    await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab);
      await new Promise((r) => setTimeout(r, 700));
    });

    const panel = await openPanelWindow(ctx, sw);
    const ready = async () => {
      await panel.waitForFunction(() => document.getElementById("group-fix") !== null, null, {
        timeout: 20000,
      });
      await wait(700);
    };
    await panel.setViewportSize({ width: 400, height: 700 });
    await ready();

    const framePage = async (viewport, scrollTo = 0) => {
      await page.bringToFront();
      await page.setViewportSize({ width: viewport.width + 1, height: viewport.height });
      await page.setViewportSize(viewport);
      await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
      await wait(700);
      const found = await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        };
        const root = document.getElementById("accesscheck-overlay")?.shadowRoot;
        const cards = [...document.querySelectorAll(".card")];
        return {
          scrollY,
          marks: [...(root?.querySelectorAll(".tag") ?? [])]
            .filter((tag) => tag.style.display !== "none")
            .map((tag) => ({ text: tag.textContent, kind: tag.className, ...box(tag) })),
          header: box(document.querySelector("header")),
          hero: box(document.querySelector(".hero")),
          muted: box(document.querySelector("main p.muted")),
          sort: box(document.querySelector(".sort")),
          buy: box(document.querySelector(".card .buy")),
          cards: cards.map(box),
          covers: cards.map((card) => box(card.querySelector("img"))),
          saves: cards.map((card) => box(card.querySelector(".save"))),
        };
      });
      return { ...viewport, ...found };
    };
    const framePanel = async (width, height, place) => {
      await panel.setViewportSize({ width, height: Math.ceil(height) });
      await wait(400);
      const found = await panel.evaluate(place);
      const shown = await panel.evaluate(() => document.body.textContent ?? "");
      const leak = shown.match(/localhost|127\.0\.0\.1|:\d{4,5}\b/);
      if (leak) throw new Error(`the panel still shows "${leak[0]}"`);
      if (!shown.includes("northwind.example")) {
        throw new Error("the panel does not show the audited address");
      }
      return { width, ...found };
    };
    const shootPage = async (name, shot, scale, clip) => {
      images[name] = await capture(
        page,
        { width: shot.width, height: shot.height, deviceScaleFactor: scale },
        clip,
      );
    };
    const shootPanel = async (name, shot, scale, view) => {
      images[name] = await capture(
        panel,
        { width: shot.width, height: Math.ceil(view.y + view.height), deviceScaleFactor: scale },
        { x: 0, y: view.y, width: shot.width, height: view.height },
      );
    };
    const toggleFinding = (key) =>
      panel.evaluate(async (id) => {
        window.scrollTo(0, 0);
        const item = document.getElementById(`finding-${id}`);
        if (!item) throw new Error(`no finding ${id} in the panel`);
        item.closest("details")?.setAttribute("open", "");
        item.querySelector("h3 > button").click();
        await new Promise((r) => setTimeout(r, 700));
      }, key);
    const press = (label) =>
      panel.evaluate(async (text) => {
        const control = [...document.querySelectorAll("button, label")].find(
          (b) => b.textContent.trim() === text,
        );
        if (!control) throw new Error(`the panel has no "${text}"`);
        control.click();
        await new Promise((r) => setTimeout(r, 500));
      }, label);

    await toggleFinding("wcag:color-contrast");
    const atRest = await framePage({ width: 704, height: 640 });
    const inView = atRest.marks.find(
      (m) => !m.kind.includes("current") && !m.kind.includes("badge"),
    );
    if (inView) {
      await panel.evaluate(async (tag) => {
        [...document.querySelectorAll('section[id^="investigation-"] button')]
          .find((b) => b.textContent.trim() === tag)
          ?.click();
        await new Promise((r) => setTimeout(r, 600));
      }, inView.text);
    }
    const chain = await framePanel(400, 700, async () => {
      const section = document.querySelector('[id="finding-wcag:color-contrast"] section');
      if (section?.dataset.chainEnd !== "tested") {
        throw new Error("5-verified-fix: the contrast fix is not marked as tested");
      }
      const bar = document.querySelector(".sticky").getBoundingClientRect().height;
      const stations = [...section.querySelectorAll(":scope > ol > li")];
      const last = stations.at(-1);
      window.scrollTo(0, Math.round(scrollY + stations[1].getBoundingClientRect().top - bar - 14));
      await new Promise((r) => setTimeout(r, 300));
      const end = (
        last.querySelector("details")?.previousElementSibling ?? last
      ).getBoundingClientRect().bottom;
      const samples = [...section.querySelectorAll('[role="img"]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, height: r.height };
      });
      const ratios = [...section.querySelectorAll("span.font-mono")]
        .map((s) => s.textContent.trim())
        .filter((text) => /^\d+\.\d\d:1$/.test(text));
      return { bar, end, samples, ratios };
    });
    const shelf = await framePage(
      { width: 704, height: 640 },
      Math.round(atRest.muted.y + atRest.scrollY - 18),
    );
    const current = shelf.marks.find((m) => m.kind.includes("current"));
    if (!current || current.y < shelf.muted.y + shelf.muted.h) {
      throw new Error("5-verified-fix: the mark's tag no longer sits below the marked text");
    }
    const fix = layouts.fix({ page: shelf, panel: chain });
    await shootPanel("fix-panel", chain, fix.p, { y: 0, height: fix.height });
    await shootPage("fix-page", shelf, fix.s, {
      x: 0,
      y: fix.from,
      width: fix.lead / fix.s,
      height: (HEIGHT - fix.top) / fix.s,
    });
    console.log("  verified fix:", `${current.text} ${chain.ratios[0]} to ${chain.ratios.at(-1)}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await panel.setViewportSize({ width: 400, height: 700 });
    await toggleFinding("wcag:color-contrast");

    await page.bringToFront();
    await page.setViewportSize({ width: 704, height: 640 });
    await sw.evaluate(async () => {
      await globalThis.__accessCheckDeepAudit();
      await new Promise((r) => setTimeout(r, 900));
    });
    await panel.reload();
    await ready();

    const whole = await framePage({ width: 704, height: 640 });
    const seen = whole.marks.map((m) => m.text).join(" ");
    if (seen !== "1 2 3 4 5 6 7") {
      throw new Error(`1-overview: the page does not show one mark per finding: ${seen}`);
    }
    const verdict = await framePanel(320, 700, async () => {
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
      const text = document.body.innerText;
      return {
        standing: document.querySelector("h2").textContent.trim(),
        counts: text.match(/\d+ to fix|\d+ to check by hand/g) ?? [],
        unseen: text.includes("no mark on screen"),
      };
    });
    if (verdict.unseen) throw new Error("1-overview: the panel says some marks are off screen");
    console.log("  overview:", [verdict.standing, ...verdict.counts].join(", "));
    const opening = layouts.opening({ page: whole, panel: verdict });
    await shootPage("opening-page", whole, 1, {
      x: 0,
      y: 0,
      width: whole.width,
      height: opening.height,
    });
    await shootPanel("opening-panel", verdict, opening.p, {
      y: 0,
      height: opening.height / opening.p,
    });

    await panel.setViewportSize({ width: 400, height: 700 });
    await panel.evaluate(() => window.scrollTo(0, 0));
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
    const walked = await framePage({ width: 800, height: 640 });
    const badges = walked.marks.filter((m) => m.kind.includes("badge"));
    console.log(
      "  focus path:",
      JSON.stringify({
        stops: walked.marks.length - badges.length,
        badges: badges.map((m) => m.text),
      }),
    );
    if (badges.length !== 1) {
      throw new Error(
        `2-focus-path: only the current stop should open its finding: ${JSON.stringify(badges)}`,
      );
    }
    const stops = await framePanel(480, 700, async () => {
      const bar = document.querySelector(".sticky").getBoundingClientRect().height;
      const heading = document.getElementById("focus-heading");
      window.scrollTo(0, Math.round(scrollY + heading.getBoundingClientRect().top - bar - 18));
      await new Promise((r) => setTimeout(r, 400));
      const section = heading.parentElement;
      const links = [...section.querySelectorAll("*")].find(
        (el) => el.children.length === 0 && el.textContent.trim().startsWith("Finding "),
      );
      if (!links) throw new Error("2-focus-path: the current stop opens no finding");
      return {
        strip: section.querySelector("ol").getBoundingClientRect().top,
        links: links.getBoundingClientRect().bottom,
      };
    });
    const path = layouts.path({ page: walked, panel: stops });
    await shootPage("path-page", walked, path.s, {
      x: 0,
      y: 0,
      width: walked.width,
      height: path.cut / path.s,
    });
    await shootPanel("path-panel", stops, path.p, path.excerpt);

    await panel.setViewportSize({ width: 400, height: 700 });
    await press("Exit");
    const wide = await framePage({ width: 1024, height: 640 });
    const numbered = wide.marks.map((m) => m.text).join(" ");
    console.log("  findings:", numbered);
    if (numbered !== "1 2 3 4 5 6 7") {
      throw new Error(`3-findings: the page does not show one mark per finding: ${numbered}`);
    }
    const list = await framePanel(320, HEIGHT / 1.6, async () => {
      const bar = document.querySelector(".sticky").getBoundingClientRect().height;
      const group = document.getElementById("group-fix");
      const target = scrollY + group.getBoundingClientRect().top - bar - 7;
      window.scrollTo(0, Math.ceil(target / 10) * 10);
      await new Promise((r) => setTimeout(r, 500));
      return { unseen: document.body.textContent.includes("no mark on screen") };
    });
    if (list.unseen) throw new Error("3-findings: the panel says some marks are off screen");
    const details = layouts.details({ page: wide, panel: list });
    const [before, between, after] = wide.cards;
    const [top, middle] = details.bands;
    if (
      before.x + before.w > middle.crop.x ||
      after.x < middle.crop.x + middle.crop.width ||
      between.x + between.w > top.crop.x ||
      wide.sort.x + wide.sort.w + 8 > top.crop.x + top.crop.width
    ) {
      throw new Error("3-findings: the page is too narrow to frame each detail on its own");
    }
    for (const [index, { crop }] of details.bands.entries()) {
      const inside = wide.marks
        .filter(
          (m) =>
            m.x + m.w > crop.x &&
            m.x < crop.x + crop.width &&
            m.y + m.h > crop.y &&
            m.y < crop.y + crop.height,
        )
        .map((m) => m.text)
        .join(" ");
      if (inside !== String(index + 1)) {
        throw new Error(`3-findings: detail ${index + 1} frames the marks ${inside || "none"}`);
      }
      await shootPage(`details-${index + 1}`, wide, details.s, crop);
    }
    await shootPanel("details-panel", list, details.p, { y: 0, height: HEIGHT / details.p });

    await page.evaluate(() => window.scrollTo(0, 0));
    await toggleFinding("wcag:image-alt");
    const located = await framePage({ width: 800, height: 640 });
    const card = await framePage(
      { width: 800, height: 640 },
      Math.round(located.covers[1].y + located.scrollY - 60),
    );
    if (card.marks.length !== 1 || !card.marks[0].kind.includes("current")) {
      throw new Error(
        `4-inspection: the image finding should mark one element: ${JSON.stringify(card.marks)}`,
      );
    }
    const named = await framePanel(400, 460, async () => {
      const item = document.getElementById("finding-wcag:image-alt");
      const bar = document.querySelector(".sticky").getBoundingClientRect().height;
      const leaves = [...item.querySelectorAll("*")].filter((el) => el.children.length === 0);
      const find = (text) => {
        const leaf = leaves.find((el) => el.textContent.trim() === text);
        if (!leaf) throw new Error(`4-inspection: the finding shows no "${text}"`);
        return leaf.getBoundingClientRect();
      };
      const target = scrollY + find("Measured").top - bar - 14;
      window.scrollTo(0, Math.floor(target / 10) * 10);
      await new Promise((r) => setTimeout(r, 400));
      return {
        change: find("With the change").bottom,
        person: find("The fix needs a person").top,
        named: (item.innerText.match(/“[^”]*”, image/g) ?? []).map((line) =>
          line.replace(/\s+/g, " "),
        ),
      };
    });
    console.log("  inspection:", `mark ${card.marks[0].text}, ${named.named.join(" then ")}`);
    const inspection = layouts.inspection({ page: card, panel: named });
    if (named.named.length !== 2 || inspection.height > named.person - 6) {
      throw new Error("4-inspection: the panel excerpt no longer ends on the changed name");
    }
    await shootPage("inspection-page", card, inspection.s, {
      ...inspection.from,
      width: inspection.lead / inspection.s,
      height: HEIGHT / inspection.s,
    });
    await shootPanel("inspection-panel", named, inspection.p, { y: 0, height: inspection.height });

    return { images, opening, path, details, inspection, fix };
  } finally {
    await ctx.close();
  }
};

const { images, opening, path, details, inspection, fix } = await gather();

const css = readFileSync(join(repo, "src/app/globals.css"), "utf8");
const token = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
const rule = `1px solid ${token.border}`;

const FONTS = `@font-face{font-family:"Atkinson Hyperlegible Next";font-weight:200 800;src:url(data:font/woff2;base64,${readFileSync(
  join(
    repo,
    "node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2",
  ),
).toString("base64")}) format("woff2-variations")}`;

const lockupSource = readFileSync(join(repo, "public/lockup-horizontal.svg"), "utf8")
  .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/stroke:\s*#3b82f6/g, `stroke:${token.ink}`)
  .replace(/fill="#0a0a0a"/g, `fill="${token.ink}"`);

const frame = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONTS}
  html,body{margin:0}
  body{position:relative;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;
    background:${token.canvas};color:${token.ink};
    font-family:"Atkinson Hyperlegible Next",sans-serif;-webkit-font-smoothing:antialiased}
  .at{position:absolute;overflow:hidden;box-sizing:border-box}
  .at img{position:absolute;left:0;top:0;display:block;max-width:none}
  h1{position:absolute;margin:0;font-weight:600;letter-spacing:-0.022em;line-height:1.06;
    white-space:nowrap}
  .lockup{position:absolute}
  .lockup svg{display:block;height:100%;width:auto}
</style></head><body>${body}</body></html>`;

const box = ({ x, y, width, height }) =>
  `left:${x}px;top:${y}px;width:${width}px;height:${height}px`;
const placed = (name, at, style = "") =>
  `<div class="at" style="${box(at)};${style}"><img src="data:image/png;base64,${images[name].toString("base64")}" alt=""></div>`;
const lockup = (x, y, height = 20) =>
  `<div class="lockup" style="left:${x}px;top:${y}px;height:${height}px">${lockupSource}</div>`;
const headline = (lines, x, y, size) =>
  `<h1 style="left:${x}px;top:${y}px;font-size:${size}px">${lines.join("<br>")}</h1>`;

const screenshots = [
  {
    name: "1-overview",
    caption: "the page and the panel together, with what the audit found",
    html: frame(
      `${lockup(MARGIN, 38, 22)}
      ${headline(HEADLINES.opening, MARGIN, 80, 50)}
      <div class="at" style="${box({ x: MARGIN - 1, y: opening.top - 1, width: opening.lead + opening.side + 2, height: opening.height + 1 })};border:${rule};border-bottom:0"></div>
      ${placed("opening-page", { x: MARGIN, y: opening.top, width: opening.lead, height: opening.height })}
      ${placed("opening-panel", { x: MARGIN + opening.lead, y: opening.top, width: opening.side, height: opening.height }, `border-left:${rule}`)}`,
    ),
  },
  {
    name: "2-focus-path",
    caption: "the real tab order, and the stops where it meets a finding",
    html: frame(
      `${placed("path-page", { x: 0, y: 0, width: WIDTH, height: path.cut }, `border-bottom:${rule}`)}
      ${lockup(MARGIN, path.cut + 54)}
      ${headline(HEADLINES.path, MARGIN, path.cut + 104, 44)}
      <div class="at" style="${box({ x: WIDTH - path.side, y: path.cut, width: 1, height: HEIGHT - path.cut })};background:${token.border}"></div>
      ${placed("path-panel", { x: WIDTH - path.side + 1, y: path.cut + 1, width: path.side - 1, height: HEIGHT - path.cut - 1 })}`,
    ),
  },
  {
    name: "3-findings",
    caption: "three findings marked on their elements, beside the list that names them",
    html: frame(
      `${lockup(MARGIN, 28)}
      ${headline(HEADLINES.findings, MARGIN, 62, 38)}
      ${details.bands
        .map((band, index) => placed(`details-${index + 1}`, band.at, `border-top:${rule}`))
        .join("")}
      ${placed("details-panel", { x: details.lead, y: 0, width: details.side, height: HEIGHT }, `border-left:${rule}`)}`,
    ),
  },
  {
    name: "4-inspection",
    caption: "one finding, from its mark to the accessible name it lacks and the change to make",
    html: frame(
      `${placed("inspection-page", { x: 0, y: 0, width: inspection.lead, height: HEIGHT }, `border-right:${rule}`)}
      ${lockup(WIDTH - inspection.side, Math.round(inspection.step / 2) - 58)}
      ${headline(HEADLINES.inspection, WIDTH - inspection.side, Math.round(inspection.step / 2) - 16, 40)}
      ${placed("inspection-panel", { x: WIDTH - inspection.side, y: inspection.step, width: inspection.side, height: HEIGHT - inspection.step }, `border-left:${rule};border-top:${rule}`)}`,
    ),
  },
  {
    name: "5-verified-fix",
    caption: "a contrast fix measured, changed and tested on the page",
    html: frame(
      `${lockup(MARGIN, Math.round((fix.bar - 20) / 2))}
      ${headline(HEADLINES.fix, MARGIN, fix.top - 128, 44)}
      ${placed("fix-page", { x: 0, y: fix.top, width: fix.lead, height: HEIGHT - fix.top }, `border-top:${rule}`)}
      ${placed("fix-panel", { x: fix.lead, y: 0, width: WIDTH - fix.lead, height: HEIGHT }, `border-left:${rule}`)}`,
    ),
  },
];

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) {
  if (file.endsWith(".png")) rmSync(join(OUT, file));
}

const browser = await chromium.launch();
const made = [];
try {
  for (const { name, caption, html } of screenshots) {
    const sheet = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    await sheet.setContent(html, { waitUntil: "load" });
    await sheet.evaluate(() => document.fonts.ready);
    const png = await sheet.screenshot({ fullPage: true });
    await sheet.close();
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== WIDTH || height !== HEIGHT) {
      throw new Error(`${name} came out ${width}×${height}, expected ${WIDTH}×${HEIGHT}`);
    }
    writeFileSync(join(OUT, `${name}.png`), png);
    made.push(`${name}.png: ${caption}`);
  }
} finally {
  await browser.close();
}

console.log(made.join("\n"));
