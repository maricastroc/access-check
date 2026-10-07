import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { openPanelWindow } from "./panel-window.mjs";

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
<style>.tiny{width:16px;height:16px;padding:0;border:0}div:empty{display:none}</style></head>
<body><main><h1>Extension fixture</h1>
<img src="/logo.png">
<input id="email" name="email" type="email" placeholder="Your email">
<button class="tiny" aria-label="one">1</button>
<div role="alert" aria-live="off">muted</div>
<p style="color:#bbb;background:#fff">baixo contraste</p>
</main>
<aside style="position:fixed;top:0;right:0;width:300px;transform:translateX(110%)"><a href="/bag" style="display:block;width:40px;height:40px"></a></aside>
</body></html>`;

const WHOLE_PAGE = HTML.replace('<html lang="en">', "<html>")
  .replace("<title>Extension fixture</title>", '<meta http-equiv="refresh" content="7200">')
  .replace(
    "</main>",
    '<span id="card"><template shadowrootmode="open"><button></button></template></span></main>',
  );

const server = createServer((q, res) => {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src * 'unsafe-inline'",
  });
  res.end(q.url === "/whole-page" ? WHOLE_PAGE : HTML);
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

  const report = await openPanelWindow(ctx, sw);
  await report.setViewportSize({ width: 400, height: 720 });
  await report.waitForFunction(() => document.getElementById("group-fix") !== null, null, {
    timeout: 20000,
  });

  const seen = await report.evaluate(() => {
    const text = document.body.textContent;
    const rows = [...document.querySelectorAll("li[data-finding] h3 > button")];
    return {
      text: text.slice(0, 160),
      groups: Object.fromEntries(
        [...document.querySelectorAll("h2")]
          .map((s) =>
            s.textContent.trim().match(/^(To fix|To check by hand|Recommendations)\s*(\d+)$/),
          )
          .filter(Boolean)
          .map((m) => [m[1], Number(m[2])]),
      ),
      landmarks: document.querySelectorAll("main").length,
      headingOrder: [...document.querySelectorAll("h1, h2, h3, h4")].map((h) =>
        Number(h.tagName.slice(1)),
      ),
      firstHeading: document.querySelector("h1")?.textContent?.trim() ?? null,
      rows: rows.map((b) => b.closest("li").id),
      origins: rows.map((b) => b.innerText),
      readsThisTab: text.includes("This tab"),
      focusPending:
        text.includes("Keyboard not checked yet") &&
        [...document.querySelectorAll("button")].some(
          (b) => b.textContent.trim() === "Check keyboard",
        ),
      partialNote: text.includes("not a full audit"),
      focusPathNamed: text.includes("focus path was not checked"),
      claimsComplete: /\bcomplete audit\b|\bfull audit score\b/i.test(text),
      notChecked: text.includes("Not checked in this version"),
      notCheckedItems: [...document.querySelectorAll("li")].map((li) => li.textContent),
      checksPerformed: [...document.querySelectorAll("details h3")].some((h) =>
        h.textContent.startsWith("Checks performed"),
      ),
      reaudit: [...document.querySelectorAll("[class*='sticky'] button")].some(
        (b) => b.textContent.trim() === "Audit again",
      ),
      claimsClean: /\bExcellent\b/i.test(text),
      claimsNoFailures: /no automated .* failures/i.test(text),
      band: (() => {
        const band = document.querySelector('[aria-labelledby="verdict-heading"]');
        const lines = [...(band?.querySelectorAll("span") ?? [])].map((x) => x.textContent.trim());
        const read = (label) =>
          Number(
            lines.find((text) => new RegExp(`^\\d+ ${label}$`).test(text))?.match(/^\d+/)?.[0] ?? 0,
          );
        return {
          fix: read("to fix"),
          check: read("to check by hand"),
          dl: !!band?.querySelector("dl"),
        };
      })(),
      screenshot: !!document.querySelector("img[alt^='Screenshot of']"),
      markers:
        document
          .querySelector("img[alt^='Screenshot of']")
          ?.parentElement.querySelectorAll("span[data-sev]").length ?? 0,
      evidenceCollapsed: [...document.querySelectorAll("details")].some(
        (d) => !!d.querySelector("img[alt^='Screenshot of']") && !d.open,
      ),
      shortSummary: /Partial coverage · \d+ check/.test(text),
      openByDefault: [...document.querySelectorAll("details")]
        .filter((d) => d.open)
        .map((d) => d.querySelector("summary")?.textContent?.trim()),
      limitationsCollapsed: [...document.querySelectorAll("details")].some(
        (d) =>
          /^About this audit/.test(d.querySelector("summary")?.textContent ?? "") &&
          d.textContent.includes("Coverage limitations") &&
          !d.open,
      ),
      order: [...document.querySelectorAll("h1, h2")]
        .map((s) => s.textContent.trim())
        .filter((t) => /^(To fix\s*\d+|Focus path|About this audit)/.test(t)),
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

  const shown = Object.values(seen.groups).reduce((a, b) => a + b, 0);
  const c = await sw.evaluate(async () => {
    const { panelState } = await chrome.storage.session.get("panelState");
    const r = panelState.state.result;
    return { ...r.counts, manualReview: r.incomplete.length };
  });
  const accounted = c.critical + c.serious + c.moderate + c.minor + c.bestPractice;

  check(before.html === after.html, "the audited DOM was modified");
  check(before.scrollY === after.scrollY, "the audited page was scrolled");
  check(seen.screenshot, "no screenshot in the panel");
  check(seen.markers > 0, "no markers drawn on the screenshot");
  check(seen.readsThisTab, "the panel does not say which tab it read");
  check(seen.focusPending, "a reading with no focus path does not say the walk is still pending");
  check(seen.partialNote, "no note saying checks were skipped");
  check(seen.focusPathNamed, "the panel does not say the focus path went unverified");
  check(!seen.claimsComplete, "the panel calls a reading with missing checks a complete audit");
  check(seen.notChecked, "the panel does not list what it skipped");
  check(seen.checksPerformed, "no collapsible list of the checks performed");
  check(seen.reaudit, "no action to audit the tab again");
  check(!seen.claimsClean, "the panel uses language suggesting a clean bill of health");
  check(!seen.claimsNoFailures, "the panel claims there are no automated failures");
  check(shown === seen.rows.length, `header says ${shown} findings, ${seen.rows.length} rows`);
  check(
    shown === accounted + c.manualReview,
    `the counts add up to ${accounted + c.manualReview} items, the queue lists ${shown}`,
  );
  check(
    (seen.groups["To check by hand"] ?? 0) >= c.manualReview,
    "a counted manual review is missing from the queue",
  );
  check(
    seen.band.fix === (seen.groups["To fix"] ?? 0),
    `the top says ${seen.band.fix} to fix, the queue lists ${seen.groups["To fix"]}`,
  );
  check(
    seen.band.check === (seen.groups["To check by hand"] ?? 0),
    `the top says ${seen.band.check} to check by hand, the queue lists ${seen.groups["To check by hand"] ?? 0}`,
  );
  check("To fix" in seen.groups, "the queue does not say what there is to fix");
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
    seen.order.findIndex((t) => t.startsWith("To fix")) <
      seen.order.findIndex((t) => t.startsWith("About this audit")),
    `findings must come before the evidence, got ${JSON.stringify(seen.order)}`,
  );

  await report.keyboard.press("Tab");
  const expanded = await report.evaluate(async () => {
    const rows = [...document.querySelectorAll('section[data-group="fix"] h3 > button')];
    const row = rows[0];
    row.focus();
    const focused = document.activeElement === row;

    const sealed = [];
    for (const each of rows) {
      const cue = /\btested\b/.test(each.innerText);
      each.click();
      await new Promise((r) => setTimeout(r, 40));
      const section = each.closest("li").querySelector("section");
      const text = section?.innerText ?? "";
      const at = (label) => text.search(new RegExp(`^${label}$`, "im"));
      sealed.push({
        rule: each.closest("li").id.split(":").pop(),
        section: section?.dataset.chainEnd === "tested",
        cue,
        ordered: at("located") === 0 && at("located") < Math.max(at("measured"), at("evidence")),
        locate: /^Locate on page$/m.test(text),
      });
      each.click();
      await new Promise((r) => setTimeout(r, 20));
    }

    row.click();
    await new Promise((r) => setTimeout(r, 50));
    const doc = document.documentElement;
    return {
      focused,
      fix: !!document.querySelector("section[id^='investigation-'] p"),
      overflow: doc.scrollWidth - doc.clientWidth,
      sealed,
      stale:
        /not re-audited|could not verify|one example checked|verified by re-audit|verified fix/i.test(
          document.body.innerText,
        ),
    };
  });
  console.log("expanded finding:", JSON.stringify(expanded));

  check(expanded.focused, "a finding row cannot take keyboard focus");
  check(expanded.fix, "an expanded finding shows no explanation or fix");
  check(expanded.overflow <= 0, `expanded finding overflows the panel by ${expanded.overflow}px`);
  check(!expanded.stale, "the panel still shows a retired verification label");
  for (const finding of expanded.sealed) {
    check(
      finding.section === finding.cue,
      `${finding.rule}: the verification section and the list cue disagree`,
    );
  }
  check(
    expanded.sealed.some((f) => !f.section),
    "every finding claims a verification result; the quiet case is not rendering",
  );
  check(
    expanded.sealed.some((f) => f.rule === "color-contrast" && f.section && f.cue),
    "the contrast fix was not marked as tested",
  );
  for (const finding of expanded.sealed) {
    check(finding.ordered, `${finding.rule}: the opened finding does not lead with where it is`);
    check(finding.locate, `${finding.rule}: a finding on an element offers no Locate on page`);
  }

  const locating = await report.evaluate(async () => {
    const row = document.querySelector('li[id$=":color-contrast"] h3 > button');
    if (row.getAttribute("aria-expanded") !== "true") row.click();
    await new Promise((r) => setTimeout(r, 60));
    const section = row.closest("li").querySelector("section");
    const locate = [...section.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Locate on page",
    );
    locate.click();
    await new Promise((r) => setTimeout(r, 900));
    const region = section.querySelector('[role="status"]');
    return {
      notice: region?.textContent || null,
      waiting: region && getComputedStyle(region).display !== "none",
    };
  });
  const drawn = await page.evaluate(() => {
    const root = document.getElementById("accesscheck-overlay")?.shadowRoot;
    const marks = [...(root?.querySelectorAll("[data-mark]") ?? [])];
    const current = marks.find((m) => m.dataset.current === "true");
    const box = current?.getBoundingClientRect();
    const target = document.querySelector("p[style]").getBoundingClientRect();
    const at = (r) => r && [r.left, r.top, r.width, r.height].map(Math.round);
    const placed = current && {
      left: parseFloat(current.style.left),
      top: parseFloat(current.style.top),
    };
    return {
      boxes: marks.length,
      onTarget:
        !!placed &&
        Math.abs(placed.top - target.top) < 12 &&
        Math.abs(placed.left - target.left) < 12,
      placed: placed && [placed.left, placed.top].map(Math.round),
      box: at(box),
      boxDisplay: current?.style.display ?? null,
      target: at(target),
      scrollY: window.scrollY,
      viewport: [innerWidth, innerHeight],
      visibility: document.visibilityState,
    };
  });
  console.log("locating an axe finding:", JSON.stringify({ ...locating, ...drawn }));
  check(drawn.boxes === 1, `Locate on page drew ${drawn.boxes} boxes for one contrast element`);
  check(drawn.onTarget, "Locate on page drew away from the low-contrast paragraph");
  check(locating.notice === null, `Locate on page answered: ${locating.notice}`);
  check(
    locating.waiting,
    "the Locate notice's live region is not rendered while empty, so a notice may go unannounced",
  );

  const tucked = await report.evaluate(async () => {
    const row = document.querySelector('li[id$=":link-name"] h3 > button');
    if (!row) return { row: false, notice: null };
    if (row.getAttribute("aria-expanded") !== "true") row.click();
    await new Promise((r) => setTimeout(r, 60));
    const section = row.closest("li").querySelector("section");
    const locate = [...section.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Locate on page",
    );
    locate.click();
    await new Promise((r) => setTimeout(r, 900));
    return { row: true, notice: section.querySelector('[role="status"]')?.textContent || null };
  });
  console.log("locating a link in a closed drawer:", JSON.stringify(tucked));
  check(tucked.row, "the link in the closed drawer was not reported");
  check(
    /not showing right now/.test(tucked.notice ?? ""),
    `Locate on page stayed quiet about a link in a closed drawer: ${tucked.notice}`,
  );

  await report.evaluate(async () => {
    document.querySelector('h3 > button[aria-expanded="true"]')?.click();
    await new Promise((r) => setTimeout(r, 600));
  });
  const queue = await report.evaluate(() =>
    [...document.querySelectorAll('section[data-group="fix"] li[id^="finding-"]')].map((li) => ({
      id: li.id.slice("finding-".length),
      n:
        [...li.querySelectorAll("h3 *")]
          .find((el) => el.children.length === 0 && /^\d+$/.test(el.textContent.trim()))
          ?.textContent.trim() ?? null,
    })),
  );
  const overview = await page.evaluate(() => {
    const root = document.getElementById("accesscheck-overlay")?.shadowRoot;
    return [...(root?.querySelectorAll(".tag") ?? [])].map((tag) => {
      const r = tag.getBoundingClientRect();
      return {
        text: tag.textContent,
        pick: tag.dataset.pick ?? null,
        shown: tag.style.display !== "none" && r.width > 0,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    });
  });
  console.log("overview with nothing open:", JSON.stringify({ queue, overview }));
  const contrastN = queue.find((f) => f.id === "wcag:color-contrast")?.n;
  const contrastTag = overview.find((m) => m.text === contrastN && m.shown);
  check(overview.length > 0, "the page shows nothing when no finding is open");
  check(
    overview.every((m) => queue.some((f) => f.n === m.text && m.pick?.startsWith(`f:${f.id}:`))),
    "an overview mark does not match its finding's number in the queue",
  );
  check(
    new Set(overview.map((m) => m.text)).size === overview.length,
    "a finding is marked more than once in the overview",
  );
  check(Boolean(contrastTag), "the low-contrast paragraph has no mark in the overview");

  const readOffScreen = () =>
    report.evaluate(
      () =>
        [...document.querySelectorAll('[aria-labelledby="verdict-heading"] p')]
          .map((p) => p.textContent)
          .find((text) => /no mark on screen right now/.test(text)) ?? null,
    );
  const hiddenMarks = overview.filter((m) => !m.shown).length;
  const offScreenNotice = await readOffScreen();
  console.log("findings not on screen:", JSON.stringify({ hiddenMarks, offScreenNotice }));
  check(hiddenMarks === 1, `the link in the closed drawer should be the one mark not shown`);
  check(
    offScreenNotice?.startsWith("1 finding to fix has no mark on screen right now") ?? false,
    `the panel does not say a finding to fix is off screen: ${offScreenNotice}`,
  );

  await page.bringToFront();
  if (contrastTag) await page.mouse.click(contrastTag.x, contrastTag.y);
  await new Promise((r) => setTimeout(r, 800));
  const opened = await report.evaluate(
    () => document.querySelector('h3 > button[aria-expanded="true"]')?.closest("li")?.id ?? null,
  );
  console.log("clicking the overview mark opened:", opened);
  check(opened === "finding-wcag:color-contrast", `clicking the mark opened ${opened}`);
  check((await readOffScreen()) === null, "the off-screen notice stays up while a finding is open");

  await page.goto(`${origin}/another-page`, { waitUntil: "domcontentloaded" });
  const moved = await report.evaluate(async () => {
    const section = document
      .querySelector('h3 > button[aria-expanded="true"]')
      .closest("li")
      .querySelector("section");
    [...section.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Locate on page")
      .click();
    await new Promise((r) => setTimeout(r, 900));
    return section.querySelector('[role="status"]')?.textContent || null;
  });
  const drewOnOther = await page.evaluate(
    () => document.getElementById("accesscheck-overlay") !== null,
  );
  console.log("locating after the tab moved on:", JSON.stringify({ moved, drewOnOther }));
  check(!drewOnOther, "marks were drawn on a page that was never audited");
  check(
    /moved to another page/.test(moved ?? ""),
    `Locate on page on another page answered: ${moved}`,
  );

  const overlayIn = (tab) =>
    tab.evaluate(() => document.getElementById("accesscheck-overlay") !== null);
  const auditActive = () =>
    sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab);
    });

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await auditActive();
  await report.evaluate(async () => {
    document.querySelector('h3 > button[aria-expanded="true"]')?.click();
    await new Promise((r) => setTimeout(r, 900));
  });
  const beforePush = await overlayIn(page);
  await page.evaluate(() => history.pushState({}, "", "/routed-elsewhere"));
  await new Promise((r) => setTimeout(r, 700));
  const afterPush = await overlayIn(page);
  console.log("an in-page route change:", JSON.stringify({ beforePush, afterPush }));
  check(beforePush, "the overview was not drawn before the route change");
  check(!afterPush, "marks stayed on the page after the app moved to another address");

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await auditActive();
  await new Promise((r) => setTimeout(r, 1200));
  const firstBefore = await overlayIn(page);
  const second = await ctx.newPage();
  await second.goto(`${origin}/second`, { waitUntil: "domcontentloaded" });
  await second.bringToFront();
  await auditActive();
  await new Promise((r) => setTimeout(r, 1200));
  const firstAfter = await overlayIn(page);
  const secondDrawn = await overlayIn(second);
  console.log("auditing a second tab:", JSON.stringify({ firstBefore, firstAfter, secondDrawn }));
  check(firstBefore, "the overview was not drawn on the first tab");
  check(!firstAfter, "auditing another tab left the first tab's marks on its page");
  check(secondDrawn, "the second tab got no overview");

  await page.bringToFront();
  await report.evaluate(async () => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Audit again")
      .click();
    await new Promise((r) => setTimeout(r, 900));
  });
  const otherTab = await sw.evaluate(
    async () => (await chrome.storage.session.get("panelState")).panelState.state.kind,
  );
  const leftOver = await overlayIn(second);
  console.log("auditing again from another tab:", JSON.stringify({ otherTab, leftOver }));
  check(otherTab === "error", `auditing again from another tab ended in ${otherTab}`);
  check(!leftOver, "the marks stayed on the page after the report gave way to an error");

  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const panelLine = () =>
    report.evaluate(
      () =>
        [...document.querySelectorAll('[aria-labelledby="verdict-heading"] p')]
          .map((p) => p.textContent)
          .find((text) => /no mark on screen right now|moved to another page/.test(text)) ?? null,
    );

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await auditActive();
  await pause(1200);
  const atAudit = { drawn: await overlayIn(page), line: await panelLine() };
  await page.evaluate(() => history.replaceState({}, "", "/?sort=asc"));
  await pause(900);
  const elsewhere = { drawn: await overlayIn(page), line: await panelLine() };
  await page.evaluate(() => history.replaceState({}, "", "/"));
  await pause(900);
  const back = { drawn: await overlayIn(page), line: await panelLine() };
  await page.reload({ waitUntil: "domcontentloaded" });
  await pause(1500);
  const reloaded = { drawn: await overlayIn(page), line: await panelLine() };
  console.log(
    "the address changes and comes back:",
    JSON.stringify({ atAudit, elsewhere, back, reloaded }),
  );
  check(atAudit.drawn, "the overview was not drawn before the address changed");
  check(!elsewhere.drawn, "marks stayed on the page after its address changed");
  check(
    /moved to another page/.test(elsewhere.line ?? ""),
    `with the tab on another address the panel said: ${elsewhere.line}`,
  );
  check(back.drawn, "the overview did not come back with the audited address");
  check(back.line === atAudit.line, `back on the audited address the panel said: ${back.line}`);
  check(reloaded.drawn, "the overview did not come back after the page reloaded");
  check(reloaded.line === atAudit.line, `after a reload the panel said: ${reloaded.line}`);

  await page.goto(`${origin}/whole-page`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await auditActive();
  await pause(1200);
  const overviewSays = {
    toFix: await report.evaluate(
      () => document.querySelectorAll('section[data-group="fix"] li[id^="finding-"]').length,
    ),
    marked: await page.evaluate(
      () =>
        [
          ...(document
            .getElementById("accesscheck-overlay")
            ?.shadowRoot?.querySelectorAll(".tag[data-pick]") ?? []),
        ].filter((t) => t.style.display !== "none").length,
    ),
    lines: await report.evaluate(() =>
      [...document.querySelectorAll('[aria-labelledby="verdict-heading"] p')]
        .map((p) => p.textContent)
        .filter((text) => /no mark|marks can't reach/.test(text)),
    ),
    shadowReason: await report.evaluate(async () => {
      document.querySelector('li[id="finding-wcag:button-name"] h3 > button')?.click();
      await new Promise((r) => setTimeout(r, 600));
      return (
        document.querySelector('li[id="finding-wcag:button-name"] section')?.textContent ?? ""
      ).includes("inside a shadow root, which the marks on the page do not reach");
    }),
  };
  const counted = (pattern) =>
    Number(overviewSays.lines.find((line) => pattern.test(line))?.match(/^\d+/)?.[0] ?? 0);
  const unmarked = counted(/no mark on screen/);
  const wholePage = counted(/whole page/);
  const inShadowRoot = counted(/shadow root/);
  console.log("findings to fix and what the overview says of them:", JSON.stringify(overviewSays));
  check(
    wholePage === 3,
    "the missing title and language and the timed refresh were not counted as the whole page's",
  );
  check(inShadowRoot === 1, "the button inside a shadow root was not counted apart");
  check(
    overviewSays.shadowReason,
    "the finding inside a shadow root does not say why it has no mark",
  );
  check(
    overviewSays.marked + unmarked + wholePage + inShadowRoot === overviewSays.toFix,
    `${overviewSays.toFix} to fix, but the page shows ${overviewSays.marked} and the panel accounts for ${unmarked + wholePage + inShadowRoot} more`,
  );

  const deepError = () =>
    sw.evaluate(
      async () =>
        (await chrome.storage.session.get("panelState")).panelState.state.deepError ?? null,
    );
  const locateNotice = () =>
    report.evaluate(async () => {
      const section = document
        .querySelector('h3 > button[aria-expanded="true"]')
        ?.closest("li")
        ?.querySelector("section");
      [...(section?.querySelectorAll("button") ?? [])]
        .find((b) => b.textContent.trim() === "Locate on page")
        ?.click();
      await new Promise((r) => setTimeout(r, 900));
      return section?.querySelector('[role="status"]')?.textContent || null;
    });

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await auditActive();
  await pause(1200);
  await report.evaluate(async () => {
    document.querySelector("li[data-finding] h3 > button").click();
    await new Promise((r) => setTimeout(r, 600));
    await chrome.runtime.sendMessage({ type: "panel:clear-highlight" });
  });
  const inFront = await ctx.newPage();
  await inFront.goto(`${origin}/second`, { waitUntil: "domcontentloaded" });
  await inFront.bringToFront();
  await pause(900);
  const behind = {
    notice: await locateNotice(),
    drawn: await overlayIn(page),
  };
  await sw.evaluate(() => globalThis.__accessCheckDeepAudit());
  behind.walk = await deepError();
  await page.bringToFront();
  await pause(1200);
  const returned = {
    drawn: await overlayIn(page),
    notice: await locateNotice(),
    walk: await deepError(),
  };
  await inFront.close();
  console.log("locating with another tab in front:", JSON.stringify({ behind, returned }));
  check(!behind.drawn, "Locate on page drew on the audited tab while another tab was in front");
  check(
    /report is for another tab/.test(behind.notice ?? ""),
    `with another tab in front Locate on page answered: ${behind.notice}`,
  );
  check(
    /report is for another tab/.test(behind.walk ?? ""),
    `with another tab in front Check keyboard answered: ${behind.walk}`,
  );
  check(returned.drawn, "back on the audited tab, Locate on page drew nothing");
  check(
    !/another tab/.test(returned.notice ?? ""),
    `back on the audited tab the finding said: ${returned.notice}`,
  );
  check(
    returned.walk === null,
    `back on the audited tab the keyboard check said: ${returned.walk}`,
  );

  const doomed = await ctx.newPage();
  await doomed.goto(`${origin}/doomed`, { waitUntil: "load" });
  await doomed.bringToFront();
  await auditActive();
  await pause(600);
  await sw.evaluate(() => globalThis.__accessCheckForgetState());
  await doomed.close();
  await pause(800);
  const afterClose = await sw.evaluate(
    async () => (await chrome.storage.session.get("panelState")).panelState.state.kind,
  );
  console.log("closing the audited tab after the worker slept:", afterClose);
  check(
    afterClose === "idle",
    `closing the audited tab after the worker slept left: ${afterClose}`,
  );

  await page.bringToFront();
  await auditActive();
  await pause(1200);
  const drawnFirst = await overlayIn(page);
  const later = await ctx.newPage();
  await later.goto(`${origin}/later`, { waitUntil: "load" });
  await pause(500);
  await sw.evaluate(() => globalThis.__accessCheckForgetState());
  await later.bringToFront();
  await auditActive();
  await pause(1200);
  const firstAfterSleep = await overlayIn(page);
  console.log(
    "auditing another tab after the worker slept:",
    JSON.stringify({ drawnFirst, firstAfterSleep }),
  );
  check(drawnFirst, "the overview was not drawn before the worker slept");
  check(!firstAfterSleep, "auditing another tab after the worker slept left the first tab's marks");

  await page.bringToFront();
  await auditActive();
  await pause(1200);
  const extId = sw.url().split("/")[2];
  const cdp = await ctx.newCDPSession(page);
  const versions = [];
  cdp.on("ServiceWorker.workerVersionUpdated", (e) => versions.push(...e.versions));
  await cdp.send("ServiceWorker.enable");
  await pause(300);
  for (const v of versions) {
    if (v.scriptURL.startsWith(`chrome-extension://${extId}/`) && v.runningStatus === "running") {
      await cdp.send("ServiceWorker.stopWorker", { versionId: v.versionId });
    }
  }
  await pause(1500);
  const drawnBeforeClose = await overlayIn(page);
  await report.close();
  await pause(1500);
  const leftAfterClose = await overlayIn(page);
  console.log(
    "closing the panel after Chrome stopped the worker:",
    JSON.stringify({ drawnBeforeClose, leftAfterClose }),
  );
  check(drawnBeforeClose, "the overview was not on the page when the worker stopped");
  check(!leftAfterClose, "closing the panel after the worker stopped left the marks on the page");

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
