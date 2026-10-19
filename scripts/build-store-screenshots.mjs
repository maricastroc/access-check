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
import { FILES, FIXTURE, SITE } from "./northwind-fixture.mjs";

const WIDTH = 1280;
const HEIGHT = 800;
const MARGIN = 48;
const repo = process.cwd();
const OUT = join(repo, "store/screenshots");
const HEADLINES = {
  opening: ["An accessibility audit of the page you’re on."],
  path: ["The tab order,", "drawn on the page."],
  findings: ["Every finding, marked on the page."],
  inspection: ["What’s missing,", "and how to fix it."],
  fix: ["A contrast fix,", "tested on the page."],
};

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
