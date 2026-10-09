import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const THEMES = process.argv.slice(2).length ? process.argv.slice(2) : ["original"];
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = Number(process.env.SCALE ?? 2);
const OUT = join(HERE, "screenshots");
const RECORDED = readFileSync(join(HERE, "data/hn.pt-BR.ndjson"), "utf8");
const TARGET = "https://news.ycombinator.com/";

const CHROME = `
nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
`;

const replay = () => {
  const now = new Date().toISOString();
  return RECORDED.split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const event = JSON.parse(line);
      if (event.result) event.result.scannedAt = now;
      return JSON.stringify(event);
    })
    .join("\n");
};

const themeCss = (name) => {
  const file = join(HERE, "themes", `${name}.css`);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};

const fontsOf = (css) => css.match(/^\/\* fonts: (.+) \*\/$/m)?.[1].trim();

async function dress(page, name) {
  const css = themeCss(name);
  const fonts = fontsOf(css);
  if (fonts) await page.addStyleTag({ url: `https://fonts.googleapis.com/css2?${fonts}&display=block` });
  await page.addStyleTag({ content: CHROME + css });
  await page.evaluate(async () => {
    const families = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const family = getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim();
      if (family) families.add(family);
    }
    await Promise.all(
      [...families].flatMap((f) =>
        ["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 16px "${f}"`).catch(() => {})),
      ),
    );
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function home(browser, name) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "pt-BR" });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await dress(page, name);
  await page.screenshot({ path: join(OUT, `${name}-home.png`) });
  await page.screenshot({ path: join(OUT, `${name}-home-full.png`), fullPage: true });
  for (const [key, selector] of Object.entries(SECTIONS)) {
    await page.locator(selector).first().screenshot({ path: join(OUT, `${name}-sec-${key}.png`) });
  }
  await context.close();
}

const SECTIONS = {
  how: "section#how",
  checks: "section#checks",
  evidence: "section#evidence",
  sandbox: "section#evidence + section",
  card: "div.mt-12.border.p-6",
  cta: "section.bg-ink",
};
const PHONE = { width: 390, height: 844 };

async function phone(browser, name) {
  const context = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: SCALE,
    locale: "pt-BR",
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await dress(page, name);
  await page.screenshot({ path: join(OUT, `${name}-m-home.png`) });

  await page.route("**/api/scan", (route) =>
    route.fulfill({ status: 200, contentType: "application/x-ndjson", body: replay() }),
  );
  await page.goto(`${ORIGIN}/results?url=${encodeURIComponent(TARGET)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(() => /A corrigir|Problemas/.test(document.body.textContent ?? ""), null, {
    timeout: 120_000,
  });
  await page.waitForLoadState("networkidle");
  await dress(page, name);
  await page.screenshot({ path: join(OUT, `${name}-m-results.png`) });
  await page.evaluate(async () => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find(
      (b) => !/Captura/.test(b.textContent ?? ""),
    );
    tab?.click();
    await new Promise((r) => setTimeout(r, 500));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${name}-m-findings.png`) });
  await context.close();
}

async function results(browser, name) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "pt-BR" });
  const page = await context.newPage();
  await page.route("**/api/scan", (route) =>
    route.fulfill({ status: 200, contentType: "application/x-ndjson", body: replay() }),
  );
  await page.goto(`${ORIGIN}/results?url=${encodeURIComponent(TARGET)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForFunction(() => /A corrigir/.test(document.body.textContent ?? ""), null, {
    timeout: 120_000,
  });
  await page.waitForLoadState("networkidle");
  await dress(page, name);
  await page.screenshot({ path: join(OUT, `${name}-results.png`) });

  await page.evaluate(async () => {
    const row = [...document.querySelectorAll("li[data-finding] h3 > button")].find((b) =>
      /contraste/i.test(b.textContent ?? ""),
    );
    row?.closest("details")?.setAttribute("open", "");
    if (row && row.getAttribute("aria-expanded") !== "true") row.click();
    await new Promise((r) => setTimeout(r, 600));
    row?.closest("li")?.scrollIntoView({ block: "start" });
    (document.activeElement instanceof HTMLElement) && document.activeElement.blur();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${name}-results-open.png`) });
  await context.close();
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chromium", headless: true });
for (const name of THEMES) {
  await home(browser, name);
  await results(browser, name);
  await phone(browser, name);
  console.log(`captured ${name}`);
}
await browser.close();
