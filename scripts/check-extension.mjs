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

const cdn = createServer((_q, res) => {
  res.writeHead(200, { "content-type": "text/css" });
  res.end(".cdn { color: #8fb8a8; background: #ffffff; }");
});
await new Promise((r) => cdn.listen(0, "127.0.0.1", r));
const cdnOrigin = `http://127.0.0.1:${cdn.address().port}`;

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Extension fixture</title>
<link rel="stylesheet" href="${cdnOrigin}/styles.css">
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
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src * 'unsafe-inline'",
  });
  res.end(HTML);
});
await new Promise((r) => server.listen(0, "localhost", r));
const origin = `http://localhost:${server.address().port}`;

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
  const noise = [];
  page.on("console", (m) => {
    if (m.type() === "error" || /preload|CORS/i.test(m.text())) {
      noise.push(`${m.type()}: ${m.text().slice(0, 120)}`);
    }
  });
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();

  const before = await page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    scrollY: window.scrollY,
    nodes: document.getElementsByTagName("*").length,
  }));

  await sw.evaluate(
    async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          window.__acUnhandled = [];
          addEventListener("unhandledrejection", (e) =>
            window.__acUnhandled.push(`unhandledrejection: ${String(e.reason).slice(0, 80)}`),
          );
          addEventListener("error", (e) => window.__acUnhandled.push(`error: ${e.message}`));
        },
      });
    },
    (await sw.evaluate(() => chrome.tabs.query({ active: true, currentWindow: true })))[0].id,
  );

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

  const unhandled = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__acUnhandled ?? ["listener never ran"],
    });
    return result;
  });
  console.log("unhandled in the isolated world:", JSON.stringify(unhandled));
  console.log("console noise:", JSON.stringify(noise));

  const report = await ctx.newPage();
  await report.setViewportSize({ width: 400, height: 720 });
  await report.goto(`chrome-extension://${sw.url().split("/")[2]}/panel.html`);
  await report.waitForFunction(() => document.body.textContent.includes("Findings"), null, {
    timeout: 20000,
  });

  const seen = await report.evaluate(() => {
    const text = document.body.textContent;
    const rows = [...document.querySelectorAll("button h3")];
    return {
      text: text.slice(0, 160),
      header: [...document.querySelectorAll("h2")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Findings · \d+$/.test(t))
        ?.split("·")[1]
        ?.trim(),
      landmarks: document.querySelectorAll("main").length,
      headingOrder: [...document.querySelectorAll("h1, h2, h3, h4")].map((h) =>
        Number(h.tagName.slice(1)),
      ),
      firstHeading: document.querySelector("h1")?.textContent?.trim() ?? null,
      rows: rows.map((h) => h.textContent),
      origins: [...document.querySelectorAll("button .font-cond.uppercase")].map(
        (s) => s.textContent,
      ),
      partialLabel: text.includes("Quick audit score"),
      preliminary: text.includes("Preliminary result"),
      partialNote: text.includes("not a full audit"),
      focusPathNamed: text.includes("focus path was not verified"),
      claimsComplete: /\bcomplete audit\b|\bfull audit score\b/i.test(text),
      notChecked: text.includes("Not checked in this build"),
      notCheckedItems: [...document.querySelectorAll("li")].map((li) => li.textContent),
      checksPerformed: !!document.querySelector("details"),
      reaudit: [...document.querySelectorAll("button")].some((b) =>
        b.textContent.includes("Audit this tab again"),
      ),
      claimsClean: /\bExcellent\b/i.test(text),
      claimsNoFailures: /no automated .* failures/i.test(text),
      counts: Object.fromEntries(
        [...document.querySelectorAll("dl > div")].map((row) => [
          row.querySelector("dd").textContent.trim(),
          Number(row.querySelector("dt").textContent),
        ]),
      ),
      screenshot: !!document.querySelector("img[alt^='Screenshot of']"),
      markers: document.querySelectorAll("span[title]").length,
      evidenceCollapsed: [...document.querySelectorAll("details")].some(
        (d) => d.textContent.includes("Evidence") && !d.open,
      ),
      shortSummary: /Partial coverage · \d+ check/.test(text),
      openByDefault: [...document.querySelectorAll("details")]
        .filter((d) => d.open)
        .map((d) => d.querySelector("summary")?.textContent?.trim()),
      limitationsCollapsed: [...document.querySelectorAll("details")].some(
        (d) =>
          /^Coverage limitations/.test(d.querySelector("summary")?.textContent ?? "") && !d.open,
      ),
      order: [...document.querySelectorAll("h1, h2")]
        .map((s) => s.textContent.trim())
        .filter((t) =>
          /^(Quick audit score|Current-tab audit score|Findings · \d+|Focus path|Coverage limitations|Checks performed|Evidence)/.test(
            t,
          ),
        ),
      requests: performance
        .getEntriesByType("resource")
        .filter((r) => !r.name.startsWith("chrome-extension://")).length,
    };
  });
  console.log(JSON.stringify(seen, null, 2));

  const failures = [];
  const check = (ok, what) => {
    if (!ok) failures.push(what);
  };

  const shown = Number(seen.header);
  const c = seen.counts;
  const accounted = c.critical + c.serious + c.moderate + c.minor + c["best practice"];

  check(before.html === after.html, "the audited DOM was modified");
  check(before.scrollY === after.scrollY, "the audited page was scrolled");
  check(seen.screenshot, "no screenshot in the panel");
  check(seen.markers > 0, "no markers drawn on the screenshot");
  check(seen.partialLabel, "a reading with no focus path is not labelled a quick audit");
  check(seen.preliminary, "a quick audit does not say the result is preliminary");
  check(seen.partialNote, "no note next to the score saying checks were skipped");
  check(seen.focusPathNamed, "the panel does not say the focus path went unverified");
  check(!seen.claimsComplete, "the panel calls a reading with missing checks a complete audit");
  check(seen.notChecked, "the panel does not list what it skipped");
  check(seen.checksPerformed, "no collapsible list of the checks performed");
  check(seen.reaudit, "no action to audit the tab again");
  check(!seen.claimsClean, "the panel uses language suggesting a clean bill of health");
  check(!seen.claimsNoFailures, "the panel claims there are no automated failures");
  check(shown === seen.rows.length, `header says ${shown} findings, ${seen.rows.length} rows`);
  check(shown === accounted, `header counts ${accounted} findings, the list shows ${shown}`);
  check(new Set(seen.rows).size === seen.rows.length, "the same finding is listed twice");
  check(
    seen.origins.some((o) => /Live regions|Target size|Keyboard/.test(o)),
    "an own-rule finding should appear in the same list, naming its source",
  );
  check(seen.requests === 0, "the panel loaded something over the network");
  check(unhandled.length === 0, `unhandled in the isolated world: ${unhandled.join("; ")}`);
  check(
    !noise.some((l) => /preload assets|blocked by CORS/i.test(l)),
    `the audit made a request Chrome would file as an extension error: ${noise.join("; ")}`,
  );
  check(
    seen.notCheckedItems.some((t) => /another origin/.test(t)),
    "the report does not explain the cross-origin assets it could not read",
  );
  check(seen.evidenceCollapsed, "the evidence section is not collapsed by default");
  check(seen.landmarks === 1, `the panel exposes ${seen.landmarks} main landmarks, expected 1`);
  check(!!seen.firstHeading, "the panel has no h1");
  check(seen.headingOrder[0] === 1, `the first heading is an h${seen.headingOrder[0]}, not an h1`);
  check(
    seen.headingOrder.every((level, i, all) => i === 0 || level <= all[i - 1] + 1),
    `the heading levels skip a step: ${JSON.stringify(seen.headingOrder)}`,
  );
  check(seen.shortSummary, "the score card does not carry the one-line coverage summary");
  check(
    seen.limitationsCollapsed,
    "the coverage limitations are not collapsed behind their own section",
  );
  check(
    seen.openByDefault.length === 0,
    `a secondary section is open by default: ${JSON.stringify(seen.openByDefault)}`,
  );
  check(
    seen.order.findIndex((t) => t.startsWith("Findings")) <
      seen.order.findIndex((t) => t.startsWith("Evidence")),
    `findings must come before the evidence, got ${JSON.stringify(seen.order)}`,
  );

  await report.keyboard.press("Tab");
  const expanded = await report.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find((b) => b.querySelector("h3"));
    row.focus();
    const focused = document.activeElement === row;
    row.click();
    await new Promise((r) => setTimeout(r, 50));
    const doc = document.documentElement;
    return {
      focused,
      fix: !!document.querySelector("button + div p"),
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
  console.log("expanded finding:", JSON.stringify(expanded));

  check(expanded.focused, "a finding row cannot take keyboard focus");
  check(expanded.fix, "an expanded finding shows no explanation or fix");
  check(expanded.overflow <= 0, `expanded finding overflows the panel by ${expanded.overflow}px`);

  if (failures.length > 0) {
    console.error("\nFAILED:\n- " + failures.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nall extension checks passed");
  }
} finally {
  await ctx.close();
  server.close();
  cdn.close();
}
