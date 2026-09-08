import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(repo, "extension/icon.svg");
const OUT = join(repo, "extension/icons");
const STORE_OUT = join(repo, "store");

const TOOLBAR = [16, 32, 48, 128];
const STORE = { size: 128, artwork: 96 };

const svg = readFileSync(SOURCE, "utf8");

async function render(page, size, artwork, transparent) {
  const pad = (size - artwork) / 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;${
      transparent ? "background:transparent" : "background:#F6F4EF"
    }">
      <div style="position:absolute;left:${pad}px;top:${pad}px;width:${artwork}px;height:${artwork}px">${svg}</div>
    </body></html>`,
  );
  return page.screenshot({ omitBackground: transparent, type: "png" });
}

const browser = await chromium.launch({ channel: "chromium", headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

mkdirSync(OUT, { recursive: true });
const written = [];

for (const size of TOOLBAR) {
  const png = await render(page, size, size, false);
  const file = join(OUT, `icon-${size}.png`);
  writeFileSync(file, png);
  written.push(`icon-${size}.png (${png.length} bytes)`);
}

const store = await render(page, STORE.size, STORE.artwork, true);
mkdirSync(STORE_OUT, { recursive: true });
writeFileSync(join(STORE_OUT, "store-icon-128.png"), store);
written.push(
  `store-icon-128.png (${store.length} bytes, ${STORE.artwork}px artwork on a ${STORE.size}px transparent canvas)`,
);

await browser.close();
console.log(written.join("\n"));
