import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const EXT = mkdtempSync(join(tmpdir(), "ac-ext-build-"));
cpSync(join(process.cwd(), "extension/dist"), EXT, { recursive: true });
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Extension fixture</title>
<style>.tiny{width:16px;height:16px;padding:0;border:0}</style></head>
<body><main><h1>Extension fixture</h1>
<img src="/logo.png">
<input id="email" name="email" type="email" placeholder="Your email">
<button class="tiny" aria-label="one">1</button>
<div role="alert" aria-live="off">muted</div>
<p style="color:#bbb;background:#fff">baixo contraste</p>
</main></body></html>`;

const server = createServer((_q, res) => {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-security-policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-ext-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  console.log("service worker:", sw.url());

  const page = await ctx.newPage();
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();

  const tabsBefore = ctx.pages().length;
  const before = await page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    scrollY: window.scrollY,
    nodes: document.getElementsByTagName("*").length,
  }));

  const shotProbe = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let shotError = null;
    try {
      await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 72 });
    } catch (e) {
      shotError = e instanceof Error ? e.message : String(e);
    }
    await globalThis.__accessCheckAuditTab(tab);
    return { shotError };
  });
  console.log("screenshot probe:", JSON.stringify(shotProbe));

  const after = await page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    scrollY: window.scrollY,
    nodes: document.getElementsByTagName("*").length,
  }));
  console.log(
    "audited DOM untouched:",
    JSON.stringify({
      sameHtml: before.html === after.html,
      sameScroll: before.scrollY === after.scrollY,
      nodes: `${before.nodes} -> ${after.nodes}`,
    }),
  );

  const report = await ctx.waitForEvent("page", { timeout: 20000 });
  await report.waitForLoadState("domcontentloaded");
  await report.waitForFunction(
    () => !document.body.textContent.includes("Loading the report"),
    null,
    { timeout: 20000 },
  );

  const seen = await report.evaluate(() => ({
    url: location.href,
    score: document.querySelector(".score")?.textContent,
    sections: [...document.querySelectorAll(".kicker")].map((k) => k.textContent),
    findings: [...document.querySelectorAll(".finding h3")].map((h) => h.textContent),
    origins: [...document.querySelectorAll(".finding .sev")].map((s) => s.textContent),
    claimsNoFailures: /no automated .* failures/i.test(document.body.textContent),
    claimsClean: /\bExcellent\b/i.test(document.body.textContent),
    partialLabel: [...document.querySelectorAll(".kicker")].some((k) =>
      /partial/i.test(k.textContent),
    ),
    partialNote: !!document.querySelector(".partial"),
    counts: Object.fromEntries(
      [...document.querySelectorAll(".counts span")].map((s) => [
        s.textContent.replace(/^\d+\s*/, "").trim(),
        Number(s.querySelector("b").textContent),
      ]),
    ),
    hasScreenshot: !!document.querySelector("figure img"),
    markers: document.querySelectorAll(".marker").length,
    gaps: [...document.querySelectorAll(".gap li")].map((li) => li.textContent),
    text: document.body.textContent.slice(0, 200),
  }));
  console.log(JSON.stringify(seen, null, 2));
  console.log("tabs before/after:", tabsBefore, ctx.pages().length);

  const failures = [];
  const check = (ok, what) => {
    if (!ok) failures.push(what);
  };

  const header = seen.sections.find((s) => s.startsWith("Findings"));
  const shown = Number(header?.split("·")[1]?.trim());

  check(before.html === after.html, "the audited DOM was modified");
  check(before.scrollY === after.scrollY, "the audited page was scrolled");
  check(seen.hasScreenshot, "no screenshot in the report");
  check(!seen.claimsNoFailures, "the report claims there are no automated failures");
  check(
    shown === seen.findings.length,
    `header says ${shown} findings, ${seen.findings.length} rows`,
  );
  check(shown > 0, "the fixture should produce findings");
  check(
    seen.origins.some((o) => !o.includes("axe-core")),
    "an own-rule finding should appear in the same list, naming its source",
  );
  check(new Set(seen.findings).size === seen.findings.length, "the same finding is listed twice");

  const c = seen.counts;
  const accounted = c.critical + c.serious + c.moderate + c.minor + c["best practice"];
  check(shown === accounted, `header counts ${accounted} findings, the list shows ${shown}`);

  check(seen.partialLabel, "the score is not labelled as a partial audit");
  check(seen.partialNote, "no note next to the score saying checks were skipped");
  check(!seen.claimsClean, "the report uses language suggesting a clean bill of health");

  if (failures.length > 0) {
    console.error("\nFAILED:\n- " + failures.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nall extension checks passed");
  }
} finally {
  await ctx.close();
  server.close();
}
