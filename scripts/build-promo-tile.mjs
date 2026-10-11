import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(repo, "store");

const WIDTH = 440;
const HEIGHT = 280;
const FRAME = { x: 156, y: 58, size: 128, arm: 28, bar: 4 };
const SYMBOL = { width: 76, height: 91 };
const TAG = { size: 42, left: 16, up: 28 };
const WORDMARK = { width: 196, y: 212 };

const css = readFileSync(join(repo, "src/app/globals.css"), "utf8");
const token = (name) => {
  const found = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!found) throw new Error(`globals.css has no --color-${name}`);
  return found[1].trim();
};
const INK = token("ink");
const CANVAS = token("canvas");
const CRITICAL = token("critical");

const mono = readFileSync(
  join(
    repo,
    "node_modules/@fontsource-variable/atkinson-hyperlegible-mono/files/atkinson-hyperlegible-mono-latin-wght-normal.woff2",
  ),
).toString("base64");

const lockup = readFileSync(join(repo, "public/lockup-horizontal.svg"), "utf8")
  .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/stroke:\s*#3b82f6/g, `stroke:${CANVAS}`)
  .replace(/fill="#0a0a0a"/g, `fill="${CANVAS}"`);
const groups = [...lockup.matchAll(/<g[\s>][\s\S]*?<\/g>/g)].map((m) => m[0]);
if (groups.length !== 2) throw new Error("the lockup no longer has a symbol and a wordmark group");
const symbol = lockup.replace(groups[1], "").replace(/viewBox="[^"]*"/, 'viewBox="0 0 39.4 47.31"');
const wordmark = lockup
  .replace(groups[0], "")
  .replace(/viewBox="[^"]*"/, 'viewBox="54.37 0 242.93 47.31"');

const at = (svg, x, y, width) =>
  `<div class="at" style="left:${x}px;top:${y}px;width:${width}px">${svg}</div>`;
const corners = [
  ["left", "top"],
  ["right", "top"],
  ["left", "bottom"],
  ["right", "bottom"],
]
  .map(
    ([h, v]) =>
      `<div class="at corner" style="${h}:${h === "left" ? FRAME.x : WIDTH - FRAME.x - FRAME.size}px;${v}:${
        v === "top" ? FRAME.y : HEIGHT - FRAME.y - FRAME.size
      }px;border-${h}:${FRAME.bar}px solid ${CANVAS};border-${v}:${FRAME.bar}px solid ${CANVAS}"></div>`,
  )
  .join("");

const browser = await chromium.launch({ channel: "chromium", headless: true });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

await page.setContent(
  `<!doctype html><html><head><style>
    @font-face{font-family:"Atkinson Hyperlegible Mono";font-weight:200 800;
      src:url(data:font/woff2;base64,${mono}) format("woff2-variations")}
    html,body{margin:0;padding:0;overflow:hidden}
    body{position:relative;width:${WIDTH}px;height:${HEIGHT}px;background:${INK}}
    .at{position:absolute}
    .at svg{display:block;width:100%;height:auto}
    .corner{width:${FRAME.arm}px;height:${FRAME.arm}px;box-sizing:border-box}
    .tag{width:${TAG.size}px;height:${TAG.size}px;box-sizing:border-box;background:${CRITICAL};
      border:2px solid ${CANVAS};color:${CANVAS};display:flex;align-items:center;
      justify-content:center;font:700 25px/1 "Atkinson Hyperlegible Mono",monospace}
  </style></head><body>
    ${corners}
    ${at(symbol, FRAME.x + (FRAME.size - SYMBOL.width) / 2, FRAME.y + (FRAME.size - SYMBOL.height) / 2, SYMBOL.width)}
    <div class="at tag" style="left:${FRAME.x - TAG.left}px;top:${FRAME.y - TAG.up}px">1</div>
    ${at(wordmark, (WIDTH - WORDMARK.width) / 2, WORDMARK.y, WORDMARK.width)}
  </body></html>`,
);
await page.evaluate(() => document.fonts.ready);

mkdirSync(OUT, { recursive: true });
const file = join(OUT, "promo-tile-440x280.png");
writeFileSync(
  file,
  await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } }),
);
await browser.close();

const head = readFileSync(file).subarray(0, 24);
console.log(
  `store/promo-tile-440x280.png: ${head.readUInt32BE(16)}×${head.readUInt32BE(20)}, the symbol marked as the product marks a page, on ${INK}`,
);
