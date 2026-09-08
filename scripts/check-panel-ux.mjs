import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const LONG = "x".repeat(400);
const PAGES = {
  "/plain": `<main><h1>Plain</h1><a href="/a">One</a><button>Two</button></main>`,
  "/long": `<main><h1>Long</h1>
    <div id="${LONG}"><section><article><div><span><a href="/deep?token=${LONG}"
      style="outline:none" title="${LONG}" aria-label="${LONG}">Deeply buried link</a></span></div></article></section></div>
  </main>`,
  "/many": `<main><h1>Many</h1>${Array.from(
    { length: 60 },
    (_, i) => `<a href="/x${i}" style="outline:none">Link ${i}</a>`,
  ).join("")}</main>`,
};

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Panel UX fixture</title>
<style>:focus{outline:2px solid #0b57d0} a[style]{outline:none!important} a{display:block}</style>
</head><body>${PAGES[req.url] ?? PAGES["/plain"]}</body></html>`);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const EXT = mkdtempSync(join(tmpdir(), "ac-ux-"));
cpSync(join(process.cwd(), "extension/dist"), EXT, { recursive: true });
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-ux-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = sw.url().split("/")[2];

  const page = await ctx.newPage();
  const audit = async (path, deep = true) => {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    await sw.evaluate(async (isDeep) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab, { deep: isDeep });
      await new Promise((r) => setTimeout(r, 600));
    }, deep);
  };

  const openPanel = async (width) => {
    const panel = await ctx.newPage();
    await panel.setViewportSize({ width, height: 800 });
    await panel.goto(`chrome-extension://${extId}/panel.html`);
    await panel.waitForFunction(() => document.querySelector("main") !== null, null, {
      timeout: 20000,
    });
    await panel.bringToFront();
    return panel;
  };

  const structure = (panel) =>
    panel.evaluate(() => {
      const doc = document.documentElement;
      return {
        overflow: doc.scrollWidth - doc.clientWidth,
        mains: document.querySelectorAll("main").length,
        h1: document.querySelectorAll("h1").length,
        levels: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1])),
        inkButtons: [...document.querySelectorAll("button")].filter((b) =>
          b.className.includes("bg-ink"),
        ).length,
      };
    });

  await audit("/plain");
  for (const width of [320, 400, 600]) {
    const panel = await openPanel(width);
    const seen = await structure(panel);
    console.log(`at ${width}px:`, JSON.stringify(seen));
    check(seen.overflow <= 0, `the panel overflows ${width}px by ${seen.overflow}px`);
    check(seen.mains === 1, `${seen.mains} main landmarks at ${width}px`);
    check(seen.h1 === 1, `${seen.h1} h1 elements at ${width}px`);
    check(
      seen.levels[0] === 1 && seen.levels.every((l, i, a) => i === 0 || l <= a[i - 1] + 1),
      `heading levels skip at ${width}px: ${JSON.stringify(seen.levels)}`,
    );
    await panel.close();
  }

  const zoomed = await openPanel(400);
  await zoomed.evaluate(() => {
    document.documentElement.style.zoom = "200%";
  });
  const atZoom = await zoomed.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  console.log("at 200% zoom:", JSON.stringify(atZoom));
  check(atZoom.overflow <= 1, `the panel overflows at 200% zoom by ${atZoom.overflow}px`);
  await zoomed.close();

  const panel = await openPanel(400);
  const keyboard = await panel.evaluate(() => {
    const focusable = [...document.querySelectorAll("button, summary, a[href], [tabindex]")].filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
    const ringless = [];
    for (const el of focusable) {
      el.focus();
      const s = getComputedStyle(el);
      const ring = s.outlineStyle !== "none" || s.boxShadow !== "none";
      if (!ring) ringless.push(el.textContent.trim().slice(0, 30) || el.tagName);
    }
    return { count: focusable.length, ringless };
  });
  console.log("keyboard:", JSON.stringify(keyboard));
  check(keyboard.count > 5, "the panel exposes almost nothing to the keyboard");
  check(keyboard.ringless.length === 0, `no focus ring on: ${keyboard.ringless.join(", ")}`);

  const shift = await panel.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find((b) => b.querySelector("h3"));
    if (!row) return { skipped: true };
    const before = row.getBoundingClientRect().top;
    row.click();
    await new Promise((r) => setTimeout(r, 120));
    return { skipped: false, moved: Math.abs(row.getBoundingClientRect().top - before) };
  });
  console.log("opening a finding:", JSON.stringify(shift));
  if (!shift.skipped) check(shift.moved <= 1, `the row jumped ${shift.moved}px when opened`);
  await panel.close();

  await audit("/long");
  const longPanel = await openPanel(400);
  const long = await longPanel.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find((b) => b.querySelector("h3"));
    row?.click();
    await new Promise((r) => setTimeout(r, 200));
    const doc = document.documentElement;
    const pre = document.querySelector("pre");
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      preScrolls: pre ? pre.scrollHeight > pre.clientHeight || pre.clientHeight <= 200 : null,
      longest: Math.max(
        ...[...document.querySelectorAll("p, pre")].map((el) => el.scrollWidth - el.clientWidth),
      ),
    };
  });
  console.log("with very long content:", JSON.stringify(long));
  check(long.overflow <= 0, `long content overflows the panel by ${long.overflow}px`);
  await longPanel.close();

  await audit("/many");
  const manyPanel = await openPanel(400);
  const many = await manyPanel.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find(
      (b) => b.querySelector("h3") && /focus/i.test(b.textContent),
    );
    row?.click();
    await new Promise((r) => setTimeout(r, 250));
    const counter = () =>
      [...document.querySelectorAll("h4")]
        .map((h) => h.textContent.trim())
        .find((t) => /^Occurrence \d+ of \d+$/.test(t));
    const first = counter();
    document.querySelector('button[aria-label="Next occurrence"]')?.click();
    await new Promise((r) => setTimeout(r, 80));
    return {
      first,
      second: counter(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log("with many occurrences:", JSON.stringify(many));
  check(/^Occurrence 1 of \d\d/.test(many.first ?? ""), `the counter reads ${many.first}`);
  check(many.second?.startsWith("Occurrence 2 of"), `Next went to ${many.second}`);
  check(many.overflow <= 0, `a long occurrence list overflows by ${many.overflow}px`);
  await manyPanel.close();

  await audit("/plain");
  const live = await openPanel(400);
  const pinned = await live.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find((b) => b.querySelector("h3"));
    row?.click();
    await new Promise((r) => setTimeout(r, 150));
    const bar = document.querySelector("h1").parentElement;
    const atTop = Math.round(bar.getBoundingClientRect().top);
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 60));
    const scrolled = Math.round(window.scrollY);
    const afterScroll = Math.round(bar.getBoundingClientRect().top);
    const chip = [...bar.querySelectorAll("button")].at(-1);
    chip?.click();
    await new Promise((r) => setTimeout(r, 60));
    return { atTop, scrolled, afterScroll, backTo: Math.round(window.scrollY) };
  });
  console.log("the header while scrolling:", JSON.stringify(pinned));
  check(pinned.scrolled > 0, "the fixture report was too short to scroll");
  check(pinned.afterScroll === pinned.atTop, `the header drifted to ${pinned.afterScroll}px`);
  check(pinned.backTo === 0, `the score chip left the reader at ${pinned.backTo}px`);

  await audit("/plain");
  await live.waitForFunction(() => document.querySelector("h1") !== null, null, { timeout: 20000 });
  const again = await structure(live);
  console.log("after a re-audit mid-reading:", JSON.stringify(again));
  check(again.mains === 1, `${again.mains} main landmarks after a re-audit`);
  check(again.h1 === 1, `${again.h1} h1 elements after a re-audit`);
  check(again.inkButtons <= 1, `${again.inkButtons} filled buttons after a re-audit`);
  check(
    again.levels[0] === 1 && again.levels.every((l, i, a) => i === 0 || l <= a[i - 1] + 1),
    `heading levels skip after a re-audit: ${JSON.stringify(again.levels)}`,
  );
  await live.close();

  if (failures.length > 0) {
    console.error("\nFAILED:\n- " + failures.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nthe panel holds up at every width, zoom and content length");
  }
} finally {
  await ctx.close();
  server.close();
}
