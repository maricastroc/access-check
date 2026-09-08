import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(repo, "store");

const WIDTH = 440;
const HEIGHT = 280;
const LOCKUP = 344;

const INK = "#17181a";
const CANVAS = "#f6f4ef";

const lockup = readFileSync(join(repo, "public/lockup-horizontal.svg"), "utf8")
  .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/stroke:\s*#3b82f6/g, `stroke:${CANVAS}`)
  .replace(/fill="#0a0a0a"/g, `fill="${CANVAS}"`);

const browser = await chromium.launch({ channel: "chromium", headless: true });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

await page.setContent(
  `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;overflow:hidden}
    body{width:${WIDTH}px;height:${HEIGHT}px;background:${INK};
         display:flex;align-items:center;justify-content:center}
    svg{width:${LOCKUP}px;height:auto;display:block}
  </style></head><body>${lockup}</body></html>`,
);

mkdirSync(OUT, { recursive: true });
const file = join(OUT, "promo-tile-440x280.png");
writeFileSync(
  file,
  await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } }),
);
await browser.close();

const head = readFileSync(file).subarray(0, 24);
console.log(
  `store/promo-tile-440x280.png — ${head.readUInt32BE(16)}×${head.readUInt32BE(20)}, lockup ${LOCKUP}px wide on ${INK}`,
);
