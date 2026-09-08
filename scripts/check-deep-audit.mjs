import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const EXT = mkdtempSync(join(tmpdir(), "ac-deep-"));
cpSync(join(process.cwd(), "extension/dist"), EXT, { recursive: true });
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

const PAGES = {
  "/ordinary": `<main>
    <a href="/a">First link</a>
    <button>Second</button>
    <input aria-label="Third" />
    <a href="/b" style="outline:none">No focus ring</a>
  </main>`,
  "/none": `<main><p>Nothing focusable here at all.</p></main>`,
  "/trap": `<main>
    <button id="a">One</button>
    <button id="b">Trap</button>
    <script>
      document.getElementById("b").addEventListener("keydown", (e) => {
        if (e.key === "Tab") { e.preventDefault(); document.getElementById("b").focus(); }
      });
    </script>
  </main>`,
  "/order": `<main>
    <button tabindex="3">Third in DOM order, first by tabindex</button>
    <button tabindex="1">Positive tabindex</button>
    <button>Natural</button>
  </main>`,
  "/many": `<main>${Array.from({ length: 80 }, (_, i) => `<button>Button ${i}</button>`).join("")}</main>`,
  "/opens": `<main>
    <button id="menu">Menu</button>
    <div id="panel"></div>
    <a href="/after">After the menu</a>
    <script>
      document.getElementById("menu").addEventListener("focus", () => {
        const panel = document.getElementById("panel");
        if (panel.children.length) return;
        const item = document.createElement("a");
        item.href = "/opened";
        item.textContent = "Opened item";
        panel.appendChild(item);
      });
    </script>
  </main>`,
  "/mixed": `<main class="dark">
    <a href="/a">Normal one</a>
    <a href="/b" style="outline:none">Broken one</a>
    <a href="/c">Normal two</a>
    <a href="/d" style="outline:none">Broken two</a>
    <a href="/e">Normal three</a>
  </main>`,
  "/lazy": `<main>
    <a href="/top" id="top">Top link</a>
    <div style="height:2400px"></div>
    <section id="late"></section>
    <script>
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setTimeout(() => {
          const late = document.getElementById("late");
          const button = document.createElement("button");
          button.id = "nameless";
          late.appendChild(button);
          const link = document.createElement("a");
          link.href = "/late";
          link.textContent = "Late link";
          late.appendChild(link);
        }, 250);
      });
      io.observe(document.getElementById("late"));
    </script>
  </main>`,
  "/churn": `<main><button>Only control</button>
    <div id="grow"></div>
    <script>
      setInterval(() => {
        document.getElementById("grow").appendChild(document.createElement("span"));
      }, 100);
    </script>
  </main>`,
  "/several": `<main>
    <a href="/one" style="outline:none">One</a>
    <a href="/two" style="outline:none">Two</a>
    <div style="height:1400px"></div>
    <a href="/three" style="outline:none">Three</a>
  </main>`,
};

const server = createServer((req, res) => {
  const body = PAGES[req.url] ?? PAGES["/ordinary"];
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Focus fixture</title>
<style>:focus { outline: 2px solid #0b57d0; } a[style] { outline: none !important; }
#nameless { width: 44px; height: 44px; }
main.dark { background: #101014; color: #f5f5f5; padding: 24px; }
main.dark a { color: #9ecbff; display: block; margin: 8px 0; }
@keyframes ac-in { from { opacity: 0 } to { opacity: 1 } }
#late > * { animation: ac-in 700ms ease-out; }</style>
</head><body>${body}</body></html>`);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-deep-p-")), {
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

  const page = await ctx.newPage();

  const audit = async (path) => {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    const before = await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      scroll: { x: window.scrollX, y: window.scrollY },
      active: document.activeElement?.tagName ?? null,
    }));

    await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab);
    });
    const shallow = await sw.evaluate(() => chrome.storage.session.get("panelState"));

    const watched = await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const target = { tabId: tab.id };
      const held = async () =>
        chrome.debugger
          .attach(target, "1.3")
          .then(async () => {
            await chrome.debugger.detach(target);
            return false;
          })
          .catch(() => true);

      let atPublish = null;
      const realSet = chrome.storage.session.set.bind(chrome.storage.session);
      chrome.storage.session.set = async (items) => {
        if (items.panelState?.state?.kind === "done" && atPublish === null) {
          atPublish = await held();
        }
        return realSet(items);
      };

      await globalThis.__accessCheckDeepAudit();
      await new Promise((r) => setTimeout(r, 600));
      chrome.storage.session.set = realSet;

      const stored = await chrome.storage.session.get("panelState");
      return { atPublish, afterEverything: await held(), state: stored.panelState?.state };
    });

    const after = await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      scroll: { x: window.scrollX, y: window.scrollY },
      active: document.activeElement?.tagName ?? null,
    }));

    return { shallow: shallow.panelState?.state, deep: watched.state, before, after, watched };
  };

  const ordinary = await audit("/ordinary");
  const kb = ordinary.deep?.result?.keyboard;
  console.log(
    "ordinary:",
    JSON.stringify({
      stops: kb?.focusPath.map((s) => s.label),
      focusVisible: kb?.focusPath.map((s) => s.focusVisible),
      findings: kb?.findings.map((f) => f.id),
      cycleComplete: kb?.cycleComplete,
      deepError: ordinary.deep?.deepError,
    }),
  );

  check(!!kb, "the deep audit produced no keyboard report");
  check(kb?.focusPath.length >= 4, `expected at least 4 focus stops, got ${kb?.focusPath.length}`);
  check(
    kb?.focusPath.some((s) => s.focusVisible === false),
    "the element with outline:none should be flagged as having no visible focus",
  );
  check(
    kb?.findings.some((f) => f.id === "focus-not-visible"),
    "no focus-not-visible finding on a page that has one",
  );
  check(
    ordinary.watched.atPublish === false,
    "the debugger was still attached when done was published",
  );
  check(ordinary.watched.afterEverything === false, "the debugger was never released");
  check(ordinary.before.html === ordinary.after.html, "the deep audit changed the page DOM");
  check(
    ordinary.before.scroll.y === ordinary.after.scroll.y,
    "the deep audit left the page scrolled",
  );
  check(
    ordinary.deep?.result?.warnings?.every((w) => w.code !== "keyboard-skipped"),
    "the report still says the focus path was skipped",
  );
  check(ordinary.deep?.result?.partial === true, "a build missing other checks must stay partial");

  const none = await audit("/none");
  console.log(
    "no focusable elements:",
    JSON.stringify({
      stops: none.deep?.result?.keyboard?.focusPath.length,
      total: none.deep?.result?.keyboard?.totalInteractive,
    }),
  );
  check(none.deep?.result?.keyboard?.focusPath.length === 0, "a page with no controls found stops");
  check(none.watched.afterEverything === false, "the debugger was never released on an empty page");

  const trap = await audit("/trap");
  console.log(
    "trap:",
    JSON.stringify({ findings: trap.deep?.result?.keyboard?.findings.map((f) => f.id) }),
  );
  check(
    trap.deep?.result?.keyboard?.findings.some((f) => f.id === "keyboard-trap"),
    "a keyboard trap was not reported",
  );

  const order = await audit("/order");
  console.log(
    "order:",
    JSON.stringify({ findings: order.deep?.result?.keyboard?.findings.map((f) => f.id) }),
  );
  check(
    order.deep?.result?.keyboard?.findings.some((f) => f.id === "positive-tabindex"),
    "a positive tabindex was not reported",
  );

  const many = await audit("/many");
  console.log(
    "scroll around the long page:",
    JSON.stringify({ before: many.before.scroll, after: many.after.scroll }),
  );
  check(
    many.before.scroll.y === many.after.scroll.y && many.before.scroll.x === many.after.scroll.x,
    `the walk left the long page at ${many.after.scroll.y}px instead of ${many.before.scroll.y}px`,
  );
  check(many.watched.atPublish === false, "the debugger outlived a capped walk");

  const kbMany = many.deep?.result?.keyboard;
  console.log(
    "cap:",
    JSON.stringify({
      stops: many.deep?.result?.keyboard?.focusPath.length,
      truncated: many.deep?.result?.keyboard?.truncated,
    }),
  );
  check(many.deep?.result?.keyboard?.truncated === true, "80 controls should truncate the walk");
  check(kbMany?.focusPath.length <= 50, "the walk went past its own cap of 50 stops");

  console.log(
    "findings reach the score:",
    JSON.stringify({
      findings: kb?.findings.map((f) => `${f.id}:${f.count}`),
      scoreBefore: ordinary.shallow?.result?.score,
      scoreAfter: ordinary.deep?.result?.score,
      seriousBefore: ordinary.shallow?.result?.counts.serious,
      seriousAfter: ordinary.deep?.result?.counts.serious,
    }),
  );
  check(kb?.findings.length > 0, "a page with a known focus failure produced no findings");
  check(
    ordinary.deep?.result?.score < ordinary.shallow?.result?.score,
    "the focus findings did not move the score",
  );
  check(
    ordinary.deep?.result?.counts.serious > ordinary.shallow?.result?.counts.serious,
    "the focus findings did not reach the counts",
  );
  check(
    ordinary.deep?.result?.keyboard?.findings.length > 0,
    "the persisted deep result carries no findings",
  );

  await page.goto(`${origin}/ordinary`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab);
  });
  const blocked = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.debugger.attach({ tabId: tab.id }, "1.3");
    try {
      await globalThis.__accessCheckDeepAudit();
      await new Promise((r) => setTimeout(r, 300));
      const stored = await chrome.storage.session.get("panelState");
      return stored.panelState?.state;
    } finally {
      await chrome.debugger.detach({ tabId: tab.id }).catch(() => {});
    }
  });
  console.log(
    "attach blocked:",
    JSON.stringify({
      kind: blocked?.kind,
      deepError: blocked?.deepError,
      score: blocked?.result?.score,
    }),
  );

  check(blocked?.kind === "done", "a failed deep audit must leave the reading on screen");
  check(
    /debugger|DevTools/i.test(blocked?.deepError ?? ""),
    "the attach failure was not explained",
  );
  check(typeof blocked?.result?.score === "number", "the previous result was lost on failure");
  check(
    blocked?.result?.warnings?.some((w) => w.code === "keyboard-skipped"),
    "a failed deep audit must still say the focus path was not walked",
  );

  const walkWithPlaywright = async (path, viewport) => {
    const solo = await ctx.newPage();
    await solo.setViewportSize(viewport);
    await solo.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await solo.addScriptTag({ path: join(process.cwd(), "dom-engine/dom-engine.js") });
    await solo.evaluate(() => window.__accessCheckDom.focusProbeStart());

    const stops = [];
    for (let i = 0; i < 50; i++) {
      await solo.keyboard.press("Tab");
      const stop = await solo.evaluate(() => window.__accessCheckDom.readFocusedStop());
      if (stop.isBody) break;
      if (stops.length > 0 && stop.selector === stops[0].selector) break;
      if (stops.length > 0 && stop.selector === stops[stops.length - 1].selector) break;
      stops.push(stop);
    }

    const selectors = [...new Set(stops.map((x) => x.selector))];
    const base = await solo.evaluate(
      (sel) => window.__accessCheckDom.readBaseStyles(sel),
      selectors,
    );
    const reach = await solo.evaluate(() => window.__accessCheckDom.readFocusReach());
    await solo.close();
    return { stops, base, reach };
  };

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const byPlaywright = await walkWithPlaywright("/ordinary", viewport);
  const byExtension = ordinary.deep?.result?.keyboard;
  console.log(
    "same fixture, both drivers:",
    JSON.stringify({
      playwright: byPlaywright.stops.map((x) => x.label),
      extension: byExtension?.focusPath.map((x) => x.label),
      reachPlaywright: byPlaywright.reach.totalInteractive,
      reachExtension: byExtension?.totalInteractive,
      viewport,
    }),
  );
  check(
    JSON.stringify(byPlaywright.stops.map((x) => x.selector)) ===
      JSON.stringify(byExtension?.focusPath.map((x) => x.selector)),
    "the two drivers walked different focus paths",
  );
  check(
    byPlaywright.reach.totalInteractive === byExtension?.totalInteractive &&
      byPlaywright.reach.reachableInteractive === byExtension?.reachableInteractive,
    "the two drivers disagreed on which controls are reachable",
  );
  check(
    JSON.stringify(byPlaywright.stops.map((x) => x.html)) ===
      JSON.stringify(byExtension?.focusPath.map((x) => x.html)),
    "the two drivers read different markup for the same stops",
  );

  const box = (r) => (r ? [r.x, r.y, r.w, r.h].join() : "none");
  check(
    JSON.stringify(byPlaywright.stops.map((x) => box(x.rect))) ===
      JSON.stringify(byExtension?.focusPath.map((x) => box(x.rect))),
    "the two drivers measured different rectangles for the same stops",
  );

  await page.goto(`${origin}/many`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab);
  });
  const interrupted = await sw.evaluate(async (target) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const running = globalThis.__accessCheckDeepAudit();
    await new Promise((r) => setTimeout(r, 250));
    await chrome.tabs.update(tab.id, { url: target });
    await running;
    await new Promise((r) => setTimeout(r, 400));
    const held = await chrome.debugger
      .attach({ tabId: tab.id }, "1.3")
      .then(async () => {
        await chrome.debugger.detach({ tabId: tab.id });
        return false;
      })
      .catch(() => true);
    const stored = await chrome.storage.session.get("panelState");
    return {
      held,
      kind: stored.panelState?.state?.kind,
      error: stored.panelState?.state?.deepError,
    };
  }, `${origin}/ordinary`);
  console.log("interrupted mid-walk:", JSON.stringify(interrupted));

  check(interrupted.held === false, "a walk cut short left the debugger attached");
  check(interrupted.kind === "done", "a walk cut short lost the reading");

  await page.goto(`${origin}/several`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  const full = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const target = { tabId: tab.id };
    const held = async () =>
      chrome.debugger
        .attach(target, "1.3")
        .then(async () => {
          await chrome.debugger.detach(target);
          return false;
        })
        .catch(() => true);

    const seen = [];
    let atFirstDone = null;
    const realSet = chrome.storage.session.set.bind(chrome.storage.session);
    chrome.storage.session.set = async (items) => {
      const st = items.panelState?.state;
      if (st) seen.push(st.kind === "running" ? `running:${st.stage}` : st.kind);
      if (st?.kind === "done" && atFirstDone === null) atFirstDone = await held();
      return realSet(items);
    };

    await globalThis.__accessCheckAuditTab(tab, { deep: true });
    await new Promise((r) => setTimeout(r, 600));
    chrome.storage.session.set = realSet;

    const stored = await chrome.storage.session.get("panelState");
    return { seen, atFirstDone, state: stored.panelState?.state };
  });
  const fullResult = full.state?.result;
  console.log(
    "one audit, one score:",
    JSON.stringify({
      seen: full.seen,
      atFirstDone: full.atFirstDone,
      score: fullResult?.score,
      stops: fullResult?.keyboard?.focusPath.length,
      findings: fullResult?.keyboard?.findings.map((f) => `${f.id}:${f.count}`),
    }),
  );

  check(
    JSON.stringify(full.seen) ===
      JSON.stringify([
        "running:structure",
        "running:rules",
        "running:focus",
        "running:report",
        "done",
      ]),
    `the audit did not run its four steps in order: ${JSON.stringify(full.seen)}`,
  );
  check(
    full.seen.indexOf("done") > full.seen.indexOf("running:focus"),
    "a score was published before the focus path had been walked",
  );
  check(full.atFirstDone === false, "the debugger was still attached at the first done");
  check(!!fullResult?.keyboard, "the main audit produced no focus path");
  check(
    fullResult?.score < 100,
    `the walked findings did not reach the score (${fullResult?.score})`,
  );

  const occurrences = fullResult?.keyboard?.findings.find((f) => f.id === "focus-not-visible");
  console.log(
    "occurrences carry their own evidence:",
    JSON.stringify(occurrences?.occurrences?.slice(0, 1)),
  );
  check(
    occurrences?.occurrences?.length === occurrences?.count,
    "the finding count and its occurrences disagree",
  );
  check(
    occurrences?.occurrences?.every((o) => o.selector && o.reason && o.html),
    "an occurrence arrived without a selector, a reason or a snippet",
  );
  check(
    !JSON.stringify(occurrences?.occurrences ?? []).includes("value="),
    "an occurrence snippet carries a value attribute",
  );

  const extId = sw.url().split("/")[2];
  await ctx
    .grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: `chrome-extension://${extId}`,
    })
    .catch(() => {});
  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: 400, height: 800 });
  await panel.goto(`chrome-extension://${extId}/panel.html`);
  await panel.waitForFunction(() => document.body.textContent.includes("Findings ·"), null, {
    timeout: 20000,
  });

  const readOverlay = () =>
    page.evaluate(() => {
      const root = document.getElementById("accesscheck-overlay");
      if (!root) return { present: false };
      const boxes = [...root.children].map((box) => ({
        badge: box.textContent,
        color: getComputedStyle(box).borderTopColor,
        width: getComputedStyle(box).borderTopWidth,
        opacity: getComputedStyle(box).opacity,
        shown: getComputedStyle(box).display !== "none",
      }));
      return {
        present: true,
        parent: root.parentElement?.tagName ?? null,
        ariaHidden: root.getAttribute("aria-hidden"),
        pointerEvents: getComputedStyle(root).pointerEvents,
        boxes,
      };
    });

  const clickByText = (text) =>
    panel.evaluate(async (label) => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === label,
      );
      if (!button) return false;
      button.click();
      await new Promise((r) => setTimeout(r, 450));
      return true;
    }, text);

  const layout = await panel.evaluate(() => {
    const text = document.body.textContent;
    const names = [
      "Current-tab audit score",
      "Quick audit score",
      "Findings",
      "Focus path",
      "Coverage limitations",
      "Checks performed",
      "Evidence",
    ];
    const order = [...document.querySelectorAll("h1, h2")]
      .map((el) => names.find((n) => el.textContent.trim().startsWith(n)))
      .filter(Boolean);
    const details = [...document.querySelectorAll("details")].map((d) => ({
      title: d.querySelector("summary")?.textContent?.trim() ?? "",
      open: d.open,
    }));
    return {
      order: [...new Set(order)],
      details,
      shortSummary: /Partial coverage · \d+ check/.test(text),
      badge: text.includes("Includes keyboard focus path"),
      claimsExpanded: text.includes("Expanded audit score"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log("panel layout:", JSON.stringify(layout));

  const place = (name) => layout.order.indexOf(name);
  check(place("Current-tab audit score") === 0, `the score does not lead: ${layout.order}`);
  check(
    place("Findings") === 1,
    `findings must come straight after the score, got ${JSON.stringify(layout.order)}`,
  );
  check(place("Focus path") > place("Findings"), "the focus path must come after the findings");
  for (const later of ["Coverage limitations", "Checks performed", "Evidence"]) {
    check(
      place(later) > place("Focus path"),
      `${later} must come after the focus path, got ${JSON.stringify(layout.order)}`,
    );
  }
  check(layout.shortSummary, "the score card does not carry the one-line coverage summary");
  check(layout.badge, "a walked focus path is not announced next to the score");
  check(!layout.claimsExpanded, 'the panel still calls the reading an "Expanded audit"');
  check(
    layout.details.every((d) => !d.open),
    `a secondary section is open by default: ${JSON.stringify(layout.details)}`,
  );
  check(
    layout.details.some((d) => d.title.startsWith("Coverage limitations")),
    "the limitations are not behind a Coverage limitations section",
  );
  check(layout.overflow <= 0, `the panel overflows 400px by ${layout.overflow}px`);

  const opened = await panel.evaluate(async () => {
    const row = [...document.querySelectorAll("button")].find(
      (b) => b.querySelector("h3") && /focus/i.test(b.textContent),
    );
    row.focus();
    const focused = document.activeElement === row;
    row.click();
    await new Promise((r) => setTimeout(r, 80));
    const text = document.body.textContent;
    const doc = document.documentElement;
    const body = [...document.querySelectorAll("span, h4")]
      .map((s) => s.textContent.trim())
      .filter((t) => /^(Suggested fix|Occurrence \d+ of \d+|Evidence|Element)/.test(t));
    return {
      focused,
      body,
      counter: body.find((t) => /^Occurrence \d+ of \d+$/.test(t)),
      reason: text.includes("A focus indicator is expected"),
      locate: [...document.querySelectorAll("button")].some(
        (b) => b.textContent.trim() === "Locate on page",
      ),
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
  console.log("a finding opens into its occurrences:", JSON.stringify(opened));

  check(opened.focused, "a finding row cannot take keyboard focus");
  check(opened.counter === "Occurrence 1 of 3", `the occurrence counter reads ${opened.counter}`);
  check(opened.reason, "an occurrence does not say what visual change was missing");
  check(opened.locate, "there is no Locate on page action");
  check(
    opened.body.indexOf("Suggested fix") < opened.body.indexOf(opened.counter) &&
      opened.body.indexOf(opened.counter) < opened.body.indexOf("Evidence") &&
      opened.body.indexOf("Evidence") < opened.body.findIndex((t) => t.startsWith("Element")),
    `the expanded finding is out of order: ${JSON.stringify(opened.body)}`,
  );
  check(opened.overflow <= 0, `the panel overflows 400px by ${opened.overflow}px`);

  const stepped = await panel.evaluate(async () => {
    const counter = () =>
      [...document.querySelectorAll("h4")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Occurrence \d+ of \d+$/.test(t));
    const press = async (label) => {
      document.querySelector(`button[aria-label="${label}"]`).focus();
      document.activeElement.click();
      await new Promise((r) => setTimeout(r, 60));
      return counter();
    };
    const start = counter();
    const next = await press("Next occurrence");
    const back = await press("Previous occurrence");
    const wrapped = await press("Previous occurrence");
    return { start, next, back, wrapped };
  });
  console.log("stepping through occurrences:", JSON.stringify(stepped));

  check(stepped.next === "Occurrence 2 of 3", `Next went to ${stepped.next}`);
  check(stepped.back === "Occurrence 1 of 3", `Previous went to ${stepped.back}`);
  check(stepped.wrapped === "Occurrence 3 of 3", `Previous from the first should wrap`);

  const copying = await panel.evaluate(async () => {
    const asked = [];
    const realWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text) => {
      asked.push(text);
      return realWrite(text).catch(() => {});
    };
    const read = async (label) => {
      const before = asked.length;
      document.querySelector(`button[aria-label="${label}"]`).click();
      await new Promise((r) => setTimeout(r, 200));
      return asked[before] ?? null;
    };
    return {
      labelled: [...document.querySelectorAll("button[aria-label^='Copy']")].map((b) =>
        b.getAttribute("aria-label"),
      ),
      copiedSelector: await read("Copy selector"),
      copiedHtml: await read("Copy HTML"),
    };
  });
  console.log("what each copy button copies:", JSON.stringify(copying));

  check(
    JSON.stringify(copying.labelled) === JSON.stringify(["Copy selector", "Copy HTML"]),
    `the copy actions do not name what they copy: ${JSON.stringify(copying.labelled)}`,
  );
  check(
    copying.copiedSelector?.includes("a:nth-of-type"),
    `Copy selector put "${copying.copiedSelector}" on the clipboard`,
  );
  check(
    copying.copiedHtml?.startsWith("<a "),
    `Copy HTML put "${copying.copiedHtml}" on the clipboard`,
  );

  await panel.evaluate(async () => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Locate on page")
      .click();
    await new Promise((r) => setTimeout(r, 500));
  });
  const located = await readOverlay();
  console.log("locate on page:", JSON.stringify(located));
  check(located.present && located.boxes.length === 1, "Locate on page drew nothing");

  await panel.evaluate(() => chrome.runtime.sendMessage({ type: "panel:clear-highlight" }));
  await new Promise((r) => setTimeout(r, 300));
  const scrollBeforeInspecting = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return window.scrollY;
  });
  await clickByText("Show focus path");
  const nearby = await readOverlay();
  const nav = await panel.evaluate(() => ({
    indicator: [...document.querySelectorAll("span")]
      .map((s) => s.textContent.trim())
      .find((t) => /^Stop \d+ of \d+$/.test(t)),
    hasPrev: !!document.querySelector('button[aria-label="Previous stop"]'),
    hasNext: !!document.querySelector('button[aria-label="Next stop"]'),
    complete: [...document.querySelectorAll("button")].some(
      (b) => b.textContent.trim() === "Show complete path",
    ),
    clear: [...document.querySelectorAll("button")].some(
      (b) => b.textContent.trim() === "Clear overlay",
    ),
  }));
  console.log("focus path drawn:", JSON.stringify({ ...nearby, nav }));

  check(nearby.present, "Show focus path drew nothing");
  check(nearby.parent === "HTML", "the overlay was not attached at the document root");
  check(nearby.ariaHidden === "true", "the overlay is exposed to assistive technology");
  check(nearby.pointerEvents === "none", "the overlay can take events from the page");
  check(nav.indicator === "Stop 1 of 3", `the focus-path indicator reads ${nav.indicator}`);
  check(nav.hasPrev && nav.hasNext, "the focus path has no Previous/Next controls");
  check(nav.complete, "there is no way to draw the complete path");
  check(nav.clear, "there is no Clear overlay action");

  const current = nearby.boxes.find((b) => /^1 · /.test(b.badge));
  const others = nearby.boxes.filter((b) => !/^1 · /.test(b.badge));
  console.log("overlay semantics:", JSON.stringify({ current, others }));
  check(!!current, `the current stop is not labelled: ${JSON.stringify(nearby.boxes)}`);
  check(current.opacity === "1", "the current stop is not at full strength");
  check(parseFloat(current.width) > 2, "the current stop is not drawn more strongly");
  check(
    others.every((b) => parseFloat(b.opacity) < 1),
    "every stop is drawn at the same strength",
  );
  check(
    others.every((b) => /^\d+$/.test(b.badge)),
    "a stop that is not current carries the current stop's label",
  );

  const stepPath = await panel.evaluate(async () => {
    document.querySelector('button[aria-label="Next stop"]').click();
    await new Promise((r) => setTimeout(r, 500));
    return {
      indicator: [...document.querySelectorAll("span")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Stop \d+ of \d+$/.test(t)),
      occurrence: [...document.querySelectorAll("h4")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Occurrence \d+ of \d+$/.test(t)),
    };
  });
  console.log("stepping the path:", JSON.stringify(stepPath));
  check(stepPath.indicator === "Stop 2 of 3", `Next stop went to ${stepPath.indicator}`);
  check(
    stepPath.occurrence === "Occurrence 2 of 3",
    `the panel did not follow the page to ${stepPath.occurrence}`,
  );

  const travelled = await panel.evaluate(async () => {
    document.querySelector('button[aria-label="Next stop"]').click();
    await new Promise((r) => setTimeout(r, 500));
    return {
      indicator: [...document.querySelectorAll("span")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Stop \d+ of \d+$/.test(t)),
      back: [...document.querySelectorAll("button")].some(
        (b) => b.textContent.trim() === "Back to where you were",
      ),
    };
  });
  const scrolledAway = await page.evaluate(() => window.scrollY);
  await clickByText("Back to where you were");
  const scrollRestored = await page.evaluate(() => window.scrollY);
  console.log(
    "inspecting moved the page:",
    JSON.stringify({ ...travelled, scrollBeforeInspecting, scrolledAway, scrollRestored }),
  );

  check(travelled.indicator === "Stop 3 of 3", `Next stop went to ${travelled.indicator}`);
  check(
    scrolledAway !== scrollBeforeInspecting,
    "stepping to a stop below the fold did not move the page",
  );
  check(travelled.back, "there is no way back to where the reader was");
  check(
    scrollRestored === scrollBeforeInspecting,
    `going back landed at ${scrollRestored} instead of ${scrollBeforeInspecting}`,
  );

  await clickByText("Show complete path");
  const everything = await readOverlay();
  console.log(
    "complete path:",
    JSON.stringify({ boxes: everything.boxes.length, nearby: nearby.boxes.length }),
  );
  check(
    everything.boxes.length >= nearby.boxes.length,
    "Show complete path drew fewer stops than the default view",
  );

  await clickByText("Clear overlay");
  const cleared = await readOverlay();
  console.log("after Clear overlay:", JSON.stringify(cleared));
  check(!cleared.present, "Clear overlay left the overlay on the page");

  const byKeyboard = await panel.evaluate(async () => {
    const focusable = [...document.querySelectorAll("button, summary, [tabindex]")].filter(
      (el) => !el.disabled,
    );
    const ringless = focusable.filter((el) => {
      el.focus();
      const s = getComputedStyle(el);
      return s.outlineStyle === "none" && s.boxShadow === "none";
    }).length;
    const details = document.querySelector("details");
    details.querySelector("summary").focus();
    document.activeElement.click();
    await new Promise((r) => setTimeout(r, 40));
    return { focusable: focusable.length, ringless, detailsOpens: details.open };
  });
  console.log("keyboard:", JSON.stringify(byKeyboard));
  check(byKeyboard.focusable > 5, "the panel exposes almost nothing to the keyboard");
  check(byKeyboard.ringless === 0, `${byKeyboard.ringless} controls show no focus ring`);
  check(byKeyboard.detailsOpens, "a collapsed section cannot be opened from the keyboard");

  const beforeHighlight = await page.evaluate(() => {
    document.querySelector('a[href="/three"]').remove();
    return document.documentElement.outerHTML;
  });
  const gone = await panel.evaluate(async () => {
    const counter = () =>
      [...document.querySelectorAll("h4")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Occurrence \d+ of \d+$/.test(t));
    for (let i = 0; i < 4 && counter() !== "Occurrence 3 of 3"; i++) {
      document.querySelector('button[aria-label="Next occurrence"]').click();
      await new Promise((r) => setTimeout(r, 60));
    }
    const at = counter();
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Locate on page",
    );
    button.click();
    await new Promise((r) => setTimeout(r, 600));
    const notice = button.parentElement.querySelector('[role="status"]');
    return {
      at,
      said: document.body.textContent.includes("no longer in the page"),
      besideTheButton: /no longer in the page/.test(notice?.textContent ?? ""),
    };
  });
  console.log("locating something that was removed:", JSON.stringify(gone));
  check(gone.at === "Occurrence 3 of 3", `the stepper never reached the removed element`);
  check(gone.said, "the panel drew on for an element that is no longer in the page");
  check(gone.besideTheButton, "the answer was not shown next to the button that asked for it");

  await panel.evaluate(async () => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Locate on page")
      .click();
    await new Promise((r) => setTimeout(r, 400));
  });
  await panel.close();
  await new Promise((r) => setTimeout(r, 700));
  const afterClose = await readOverlay();
  console.log("after the panel closes:", JSON.stringify({ present: afterClose.present }));
  check(!afterClose.present, "closing the panel left a highlight on the page");

  const again = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab, { deep: true });
    const stored = await chrome.storage.session.get("panelState");
    return stored.panelState?.state?.result;
  });
  const afterAudit = await page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    overlay: !!document.getElementById("accesscheck-overlay"),
  }));
  console.log(
    "the next audit sees no overlay:",
    JSON.stringify({
      sameHtml: beforeHighlight === afterAudit.html,
      overlayInPage: afterAudit.overlay,
      selectorsMention: JSON.stringify(again?.keyboard ?? {}).includes("accesscheck-overlay"),
    }),
  );
  check(!afterAudit.overlay, "an overlay survived into the next audit");
  check(beforeHighlight === afterAudit.html, "the highlight left something behind in the page");
  check(
    !JSON.stringify(again ?? {}).includes("accesscheck-overlay"),
    "the audit reported the extension's own overlay as page content",
  );

  const walkChanged = async (path) => {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    const state = await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab, { deep: true });
      await new Promise((r) => setTimeout(r, 600));
      return (await chrome.storage.session.get("panelState")).panelState?.state;
    });
    return (state?.result?.warnings ?? []).map((w) => w.code);
  };
  const opensWarnings = await walkChanged("/opens");
  const quietWarnings = await walkChanged("/ordinary");
  console.log(
    "did the walk change the page:",
    JSON.stringify({ opens: opensWarnings, ordinary: quietWarnings }),
  );

  check(opensWarnings.includes("walk-changed-page"), "a walk that opened a panel did not say so");
  check(
    !quietWarnings.includes("walk-changed-page"),
    "a page the walk did not change was reported as changed",
  );

  await page.goto(`${origin}/mixed`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab, { deep: true });
    await new Promise((r) => setTimeout(r, 600));
  });

  const mixedPanel = await ctx.newPage();
  await mixedPanel.setViewportSize({ width: 400, height: 800 });
  await mixedPanel.goto(`chrome-extension://${extId}/panel.html`);
  await mixedPanel.waitForFunction(() => document.body.textContent.includes("Focus path"), null, {
    timeout: 20000,
  });

  const words = await mixedPanel.evaluate(() => {
    const text = document.body.textContent;
    return {
      reachable: /reachable/i.test(text),
      caveat: /caveat/i.test(text),
      checkedFirst:
        /Checked the first \d+ of \d+ detected controls\.|Walked the full tab order/.test(text),
      quick: [...document.querySelectorAll("button")].some(
        (b) => b.textContent.trim() === "Run quick audit",
      ),
      quickNamed: !!document
        .querySelector('button[aria-describedby="quick-audit-note"]')
        ?.textContent?.includes("Run quick audit"),
    };
  });
  console.log("wording:", JSON.stringify(words));

  check(!words.reachable, 'the panel still calls visited controls "reachable"');
  check(!words.caveat, 'the panel still uses the word "caveat"');
  check(words.checkedFirst, "the focus path does not say what it actually covered");
  check(words.quick && words.quickNamed, "the quick audit is not an unambiguous named action");

  const pressMixed = (label) =>
    mixedPanel.evaluate(async (text) => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      );
      if (!button) return false;
      button.click();
      await new Promise((r) => setTimeout(r, 450));
      return true;
    }, label);

  await pressMixed("Show focus path");
  await mixedPanel.evaluate(async () => {
    document.querySelector('button[aria-label="Next stop"]').click();
    await new Promise((r) => setTimeout(r, 450));
  });
  const mixedBoxes = await page.evaluate(() => {
    const root = document.getElementById("accesscheck-overlay");
    return [...(root?.children ?? [])].map((box) => {
      const style = getComputedStyle(box);
      return {
        badge: box.textContent,
        color: style.borderTopColor,
        opacity: style.opacity,
        outline: style.outlineColor,
        shadow: style.boxShadow.includes("rgba(23, 24, 26"),
      };
    });
  });
  console.log("mixed page, stop 2 current:", JSON.stringify(mixedBoxes));

  const currentBox = mixedBoxes.find((b) => /^2 · /.test(b.badge));
  const neighbours = mixedBoxes.filter((b) => !/^2 · /.test(b.badge));
  check(!!currentBox, `the current stop is not labelled: ${JSON.stringify(mixedBoxes)}`);
  check(
    currentBox.color === "rgb(179, 38, 30)",
    `a failing current stop should be red, got ${currentBox.color}`,
  );
  check(
    neighbours.every((b) => b.color === "rgb(26, 86, 196)"),
    `a neighbour inherited a failure colour: ${JSON.stringify(neighbours.map((b) => b.color))}`,
  );
  check(
    neighbours.every((b) => parseFloat(b.opacity) < 1),
    "the neighbours are as loud as the stop being inspected",
  );

  check(
    mixedBoxes.every((b) => b.outline.startsWith("rgba(255, 255, 255") && b.shadow),
    `the boxes carry no two-tone ring: ${JSON.stringify(mixedBoxes.map((b) => b.outline))}`,
  );

  await pressMixed("Clear overlay");
  await mixedPanel.close();

  await page.goto(`${origin}/ordinary`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  const timeline = await sw.evaluate(async () => {
    const marks = [];
    const realDetach = chrome.debugger.detach.bind(chrome.debugger);
    const realSet = chrome.storage.session.set.bind(chrome.storage.session);

    chrome.debugger.detach = async (target) => {
      marks.push({ what: "detach:called", t: Date.now() });
      try {
        const out = await realDetach(target);
        marks.push({ what: "detach:resolved", t: Date.now() });
        return out;
      } catch (e) {
        marks.push({ what: "detach:rejected", t: Date.now() });
        throw e;
      }
    };
    chrome.storage.session.set = async (items) => {
      const st = items.panelState?.state;
      if (st) {
        marks.push({
          what: st.kind === "running" ? `publish:running:${st.stage}` : `publish:${st.kind}`,
          t: Date.now(),
        });
      }
      return realSet(items);
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await globalThis.__accessCheckAuditTab(tab, { deep: true });
    await new Promise((r) => setTimeout(r, 600));

    chrome.debugger.detach = realDetach;
    chrome.storage.session.set = realSet;
    return marks;
  });

  const first = (what) => timeline.findIndex((m) => m.what === what);
  const detachedAt = first("detach:resolved");
  const doneAt = first("publish:done");
  const zero = timeline[0]?.t ?? 0;
  console.log(
    "order of detach and publish:",
    JSON.stringify(timeline.map((m) => `${m.what}@+${m.t - zero}ms`)),
  );

  check(detachedAt > -1, "the debugger was never detached during a deep audit");
  check(doneAt > -1, "the deep audit never published a result");
  check(
    detachedAt < doneAt,
    `the result was published before the debugger was let go: ${JSON.stringify(timeline.map((m) => m.what))}`,
  );
  check(
    timeline[doneAt].t - timeline[detachedAt].t >= 0,
    "the publish timestamp precedes the detach timestamp",
  );

  const walkOf = (state) => state?.result?.keyboard?.focusPath.map((s) => s.selector) ?? [];
  const runHere = () =>
    sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab, { deep: true });
      await new Promise((r) => setTimeout(r, 600));
      return (await chrome.storage.session.get("panelState")).panelState?.state;
    });

  await page.goto(`${origin}/many`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  const firstPass = await runHere();
  const secondPass = await runHere();
  const walkA = walkOf(firstPass);
  const walkB = walkOf(secondPass);
  console.log(
    "twice on the same page:",
    JSON.stringify({
      startedAtTop: [
        firstPass?.result?.keyboard?.startedAtTop,
        secondPass?.result?.keyboard?.startedAtTop,
      ],
      stops: [walkA.length, walkB.length],
      firstStop: [walkA[0], walkB[0]],
      sameWalk: JSON.stringify(walkA) === JSON.stringify(walkB),
      scores: [firstPass?.result?.score, secondPass?.result?.score],
      findings: [
        firstPass?.result?.keyboard?.findings.map((f) => `${f.id}:${f.count}`),
        secondPass?.result?.keyboard?.findings.map((f) => `${f.id}:${f.count}`),
      ],
    }),
  );

  check(walkA.length > 0, "the first of two audits walked nothing");
  check(
    firstPass?.result?.keyboard?.startedAtTop === true &&
      secondPass?.result?.keyboard?.startedAtTop === true,
    "a walk did not start at the first control",
  );
  check(
    JSON.stringify(walkA) === JSON.stringify(walkB),
    "two audits of the same page walked different controls",
  );
  check(
    firstPass?.result?.score === secondPass?.result?.score,
    `two audits of the same page scored ${firstPass?.result?.score} and ${secondPass?.result?.score}`,
  );

  const manyPanel = await ctx.newPage();
  await manyPanel.setViewportSize({ width: 400, height: 800 });
  await manyPanel.goto(`chrome-extension://${extId}/panel.html`);
  await manyPanel.waitForFunction(() => document.body.textContent.includes("Focus path"), null, {
    timeout: 20000,
  });
  const drawnCount = () =>
    page.evaluate(() => document.getElementById("accesscheck-overlay")?.children.length ?? 0);
  const pressIn = (label) =>
    manyPanel.evaluate(async (text) => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      );
      if (!button) return false;
      button.click();
      await new Promise((r) => setTimeout(r, 500));
      return true;
    }, label);

  await pressIn("Show focus path");
  const defaultView = await drawnCount();
  await pressIn("Show complete path");
  const completeView = await drawnCount();
  const palette = await page.evaluate(() => {
    const root = document.getElementById("accesscheck-overlay");
    return [...new Set([...(root?.children ?? [])].map((b) => getComputedStyle(b).borderTopColor))];
  });
  await pressIn("Clear overlay");
  const clearedView = await drawnCount();
  await manyPanel.close();
  console.log(
    "fifty stops:",
    JSON.stringify({ stops: walkA.length, defaultView, completeView, clearedView, palette }),
  );

  check(walkA.length >= 50, "the long fixture did not produce fifty stops");
  check(
    defaultView > 0 && defaultView <= 2 * 2 + 1,
    `the default view drew ${defaultView} stops instead of a small neighbourhood`,
  );
  check(
    completeView > defaultView,
    `Show complete path drew ${completeView}, no more than the default ${defaultView}`,
  );
  check(clearedView === 0, "Clear overlay left stops on the page");
  check(
    palette.includes("rgb(26, 86, 196)"),
    `no ordinary stop was drawn in the neutral colour: ${JSON.stringify(palette)}`,
  );
  check(
    !palette.includes("rgb(179, 38, 30)") || palette.length > 1,
    "every stop on this page was painted as a failure",
  );

  await page.goto(`${origin}/lazy`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await page.evaluate(() => {
    document.getElementById("top").focus();
    window.scrollTo(0, 300);
  });
  const startedFrom = await page.evaluate(() => ({
    scroll: { x: window.scrollX, y: window.scrollY },
    focused: document.activeElement?.id ?? null,
    elements: document.querySelectorAll("*").length,
  }));

  const lazyFirst = await runHere();
  const midway = await page.evaluate(() => ({
    scroll: { x: window.scrollX, y: window.scrollY },
    focused: document.activeElement?.id ?? null,
    elements: document.querySelectorAll("*").length,
    overlay: !!document.getElementById("accesscheck-overlay"),
  }));
  const lazySecond = await runHere();
  const ended = await page.evaluate(() => ({
    scroll: { x: window.scrollX, y: window.scrollY },
    focused: document.activeElement?.id ?? null,
    elements: document.querySelectorAll("*").length,
    overlay: !!document.getElementById("accesscheck-overlay"),
  }));

  const shape = (state) => ({
    score: state?.result?.score,
    axe: (state?.result?.violations ?? []).map((v) => `${v.id}:${v.nodes}`).sort(),
    keyboard: (state?.result?.keyboard?.findings ?? []).map((f) => `${f.id}:${f.count}`).sort(),
    walk: walkOf(state),
  });
  const one = shape(lazyFirst);
  const two = shape(lazySecond);

  console.log(
    "lazy content, audited twice:",
    JSON.stringify({
      startedFrom,
      afterFirst: midway,
      afterSecond: ended,
      first: { score: one.score, axe: one.axe, keyboard: one.keyboard, stops: one.walk.length },
      second: { score: two.score, axe: two.axe, keyboard: two.keyboard, stops: two.walk.length },
      sameWalk: JSON.stringify(one.walk) === JSON.stringify(two.walk),
    }),
  );

  check(
    one.axe.includes("button-name:1"),
    "the first audit missed the control that renders on scroll",
  );
  check(
    one.walk.some((selector) => /a:nth-of-type\(2\)|#late/.test(selector)) || one.walk.length > 1,
    "the first audit's focus path never reached the lazy content",
  );
  check(one.score === two.score, `two audits scored ${one.score} and ${two.score}`);
  check(
    JSON.stringify(one.axe) === JSON.stringify(two.axe),
    `the rules disagreed between audits: ${JSON.stringify(one.axe)} vs ${JSON.stringify(two.axe)}`,
  );
  check(
    JSON.stringify(one.keyboard) === JSON.stringify(two.keyboard),
    "the focus findings disagreed between audits",
  );
  check(
    JSON.stringify(one.walk) === JSON.stringify(two.walk),
    "the two walks covered different controls",
  );
  check(
    midway.elements === ended.elements,
    `the page kept growing between audits: ${midway.elements} then ${ended.elements}`,
  );
  check(
    ended.scroll.y === startedFrom.scroll.y && ended.scroll.x === startedFrom.scroll.x,
    `the page ended at ${ended.scroll.y}px instead of ${startedFrom.scroll.y}px`,
  );
  check(
    ended.focused === startedFrom.focused,
    `focus ended on ${ended.focused} instead of ${startedFrom.focused}`,
  );
  check(!midway.overlay && !ended.overlay, "an AccessCheck overlay was left in the audited page");
  check(
    !JSON.stringify(lazySecond?.result ?? {}).includes("accesscheck-overlay"),
    "the reading names the extension's own overlay",
  );

  const primeCost = async (path) => {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    return sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["vendor/axe.min.js", "dom-engine.js", "audit.js"],
      });
      const [{ result: settled }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__accessCheckSettle(),
      });
      const before = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.querySelectorAll("*").length,
      });
      const started = Date.now();
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (given) => window.__accessCheckPrime(given),
        args: [settled],
      });
      const after = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          elements: document.querySelectorAll("*").length,
          animating: document.getAnimations().filter((a) => a.playState === "running").length,
        }),
      });
      return {
        ...result.prime,
        settled: result.readiness.settled,
        wallMs: Date.now() - started,
        rendered: after[0].result.elements - before[0].result,
        animating: after[0].result.animating,
      };
    });
  };
  const shortPage = await primeCost("/ordinary");
  const longPage = await primeCost("/lazy");
  console.log(
    "what priming costs:",
    JSON.stringify({
      short: { steps: shortPage.steps, wallMs: shortPage.wallMs, rendered: shortPage.rendered },
      lazy: {
        steps: longPage.steps,
        wallMs: longPage.wallMs,
        rendered: longPage.rendered,
        stillAnimating: longPage.animating,
      },
    }),
  );

  check(shortPage.steps === 0, "a page with nothing to scroll was still walked");
  check(shortPage.wallMs < 150, `priming a short page cost ${shortPage.wallMs}ms`);
  check(shortPage.rendered === 0, "priming changed a page that has nothing to render on scroll");
  check(longPage.steps > 0, "a long page was not walked for lazy content");
  check(longPage.rendered > 0, "priming the lazy page rendered nothing");
  check(longPage.wallMs < 2_500, `priming the lazy page cost ${longPage.wallMs}ms`);
  check(longPage.restored, "priming did not put the viewport back");
  check(
    longPage.animating === 0,
    `${longPage.animating} entry animations were still running when the rules were about to read the page`,
  );

  await page.goto(`${origin}/churn`, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  const churn = await runHere();
  const settledPage = await (async () => {
    await page.goto(`${origin}/ordinary`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    return runHere();
  })();
  console.log(
    "a page that will not settle:",
    JSON.stringify({
      churn: churn?.result?.warnings?.map((w) => w.code),
      settled: settledPage?.result?.warnings?.map((w) => w.code),
    }),
  );

  check(
    churn?.result?.warnings?.some((w) => w.code === "content-unsettled"),
    "a page that never stops changing was reported as if it had settled",
  );
  check(
    !settledPage?.result?.warnings?.some((w) => w.code === "content-unsettled"),
    "a static page was wrongly reported as still changing",
  );

  await audit("/ordinary");

  const survived = await sw.evaluate(async () => {
    globalThis.__accessCheckForgetState();
    const stored = await chrome.storage.session.get("panelState");
    return {
      inStorage: stored.panelState?.state?.kind,
      hasKeyboard: !!stored.panelState?.state?.result?.keyboard,
    };
  });
  console.log("after the worker forgets:", JSON.stringify(survived));

  check(survived.inStorage === "done", "the state did not outlive the worker's memory");
  check(survived.hasKeyboard, "the focus path did not outlive the worker's memory");

  const stillThere = await sw.evaluate(async () => {
    const stored = await chrome.storage.session.get("panelState");
    const path = stored.panelState?.state?.result?.keyboard?.focusPath ?? [];
    return path.slice(0, 1).map((s) => ({ n: s.n, selector: s.selector, kind: "stop" }));
  });

  const asleep = await ctx.newPage();
  await asleep.setViewportSize({ width: 400, height: 800 });
  await asleep.goto(`chrome-extension://${extId}/panel.html`);
  await asleep.waitForFunction(() => document.body.textContent.includes("Findings ·"), null, {
    timeout: 20000,
  });

  await sw.evaluate(() => globalThis.__accessCheckForgetState());

  const revived = await asleep.evaluate(
    (marks) =>
      chrome.runtime.sendMessage({
        type: "panel:highlight",
        marks,
        focus: marks[0].n,
        scroll: true,
        timeoutMs: 4000,
      }),
    stillThere,
  );
  const drawnAfterSleep = await page.evaluate(
    () => !!document.getElementById("accesscheck-overlay"),
  );
  console.log(
    "an action after the worker slept:",
    JSON.stringify({ marks: stillThere.length, revived, drawn: drawnAfterSleep }),
  );

  check(
    revived?.ok === true,
    `highlighting after the worker slept failed: ${JSON.stringify(revived)}`,
  );
  check(drawnAfterSleep, "nothing was drawn on the page after the worker had been asleep");

  await asleep.close();

  if (failures.length > 0) {
    console.error("\nFAILED:\n- " + failures.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("\nall deep-audit checks passed");
  }
} finally {
  await ctx.close();
  server.close();
}
