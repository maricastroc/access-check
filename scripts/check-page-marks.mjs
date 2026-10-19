import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { openPanelWindow } from "./panel-window.mjs";
import { FILES, FIXTURE, SITE } from "./northwind-fixture.mjs";

const SHOTS = process.env.MARKS_SHOTS ?? null;

const EXT = mkdtempSync(join(tmpdir(), "ac-marks-"));
cpSync(join(process.cwd(), "extension/dist"), EXT, { recursive: true });
const manifest = JSON.parse(readFileSync(join(EXT, "manifest.json"), "utf8"));
manifest.host_permissions = ["<all_urls>"];
writeFileSync(join(EXT, "manifest.json"), JSON.stringify(manifest, null, 2));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ac-marks-p-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
await ctx.route(`${SITE}**`, (route) => {
  const art = FILES[new URL(route.request().url()).pathname];
  return art
    ? route.fulfill({ status: 200, contentType: "image/svg+xml", body: art })
    : route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FIXTURE });
});

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  await panel.setViewportSize({ width: 400, height: 700 });
  await panel.waitForFunction(() => document.getElementById("group-fix") !== null, null, {
    timeout: 20000,
  });
  await wait(800);

  const shoot = async (name) => {
    if (!SHOTS) return;
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, `${name}-page.png`) });
    await panel.screenshot({ path: join(SHOTS, `${name}-panel.png`) });
  };

  const line = () =>
    panel.evaluate(() => {
      const el = document.querySelector("[data-page-line]");
      return {
        shown: [...(el?.querySelector("p")?.children ?? [])]
          .slice(1)
          .filter((n) => !n.classList.contains("sr-only"))
          .map((n) => n.textContent)
          .join(" "),
        said: el?.querySelector('[role="status"]')?.textContent ?? null,
        counter: el?.querySelector(".tabular-nums > [aria-hidden]")?.textContent ?? null,
        buttons: [...(el?.querySelectorAll("button") ?? [])].map(
          (b) => b.getAttribute("aria-label") ?? b.textContent,
        ),
      };
    });

  const press = (text) =>
    panel.evaluate(async (label) => {
      const button = [...document.querySelectorAll("button, label")].find(
        (b) => b.textContent.trim() === label || b.getAttribute("aria-label") === label,
      );
      if (!button) throw new Error(`the panel has no "${label}"`);
      button.click();
      await new Promise((r) => setTimeout(r, 700));
    }, text);

  const marks = (texts) =>
    page.evaluate((selectors) => {
      const root = document.getElementById("accesscheck-overlay")?.shadowRoot;
      const tags = [...(root?.querySelectorAll(".tag") ?? [])]
        .filter((t) => t.style.display !== "none")
        .map((t) => ({ text: t.textContent, r: t.getBoundingClientRect().toJSON() }));
      const boxes = selectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].flatMap((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return [...range.getClientRects()].map((r) => ({ selector, r: r.toJSON() }));
        }),
      );
      const covered = tags.flatMap((tag) =>
        boxes
          .filter(
            ({ r }) =>
              tag.r.left < r.right &&
              r.left < tag.r.right &&
              tag.r.top < r.bottom &&
              r.top < tag.r.bottom,
          )
          .map(({ selector }) => `${tag.text} over ${selector}`),
      );
      return {
        drawn: Boolean(root),
        tags: tags.map((t) => t.text),
        covered,
        dimmed: root?.querySelector(".stage")?.dataset.hover === "true",
        leaders: root?.querySelectorAll("g.leader").length ?? 0,
      };
    }, texts);

  const PAGE_TEXT = ["h1", "h3", "h4", "p", "a", "button", "strong", "span.price", "option"];

  const overview = await marks(PAGE_TEXT);
  const atOverview = await line();
  console.log("overview:", JSON.stringify({ overview, atOverview }));
  await shoot("overview");
  check(overview.tags.length > 3, `the overview drew ${overview.tags.length} tags`);
  check(
    !overview.covered.some((c) => c.endsWith("over h3")),
    `a tag covers "This month on the table": ${overview.covered.join(", ")}`,
  );
  check(overview.covered.length === 0, `overview tags cover text: ${overview.covered.join(", ")}`);
  check(
    /^All findings · \d+ of \d+ marked here$/.test(atOverview.shown),
    `the page line reads "${atOverview.shown}" over the overview`,
  );
  check(
    /^On the page: All findings, \d+ of \d+ marked here$/.test(atOverview.said ?? ""),
    `the page line announces "${atOverview.said}"`,
  );
  check(atOverview.buttons.includes("Clear"), "the overview has no Clear");

  const pointed = await panel.evaluate(async () => {
    const row = document.querySelector('section[data-group="fix"] li h3 > button');
    row.focus();
    await new Promise((r) => setTimeout(r, 500));
    return row.closest("li").id;
  });
  const whilePointed = await marks([]);
  await shoot("pointed");
  await panel.evaluate(async () => {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 500));
  });
  const afterPointed = await marks([]);
  console.log("focusing a row:", JSON.stringify({ pointed, whilePointed, afterPointed }));
  check(whilePointed.dimmed, "focusing a row did not bring its mark forward on the page");
  check(!afterPointed.dimmed, "the page stayed dimmed after the row lost focus");

  await panel.evaluate(async () => {
    document.querySelector('[id="finding-wcag:color-contrast"] h3 > button').click();
    await new Promise((r) => setTimeout(r, 700));
  });
  const opened = await line();
  console.log("a finding open:", JSON.stringify(opened));
  await shoot("finding");
  check(
    /^All findings › \d+ · .+ › \d+·1$/.test(opened.shown),
    `with a finding open the page line reads "${opened.shown}"`,
  );
  await press("All findings");
  check(
    (await line()).shown.startsWith("All findings ·"),
    "All findings did not close the finding and go back to the overview",
  );

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await wait(600);
  const scrolled = await panel.evaluate(() => ({
    line: document.querySelector("[data-page-line] p")?.textContent ?? "",
    away: [...document.querySelectorAll('section[data-group="fix"] li')]
      .filter((li) => li.textContent.includes("off screen"))
      .map((li) => li.id),
  }));
  console.log("with the page scrolled down:", JSON.stringify(scrolled));
  check(scrolled.away.length > 0, "no row says its mark is off screen after the page scrolled");
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);

  await sw.evaluate(async () => {
    await globalThis.__accessCheckDeepAudit();
    await new Promise((r) => setTimeout(r, 800));
  });
  await panel.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((b) => b.textContent === "Inspect tab order"),
    null,
    { timeout: 30000 },
  );
  await press("Inspect tab order");
  const NAV = ["nav a", "header strong", ".search", ".cart"];
  const pathAt = [];
  for (let stop = 1; stop <= 4; stop++) {
    const seen = await marks(NAV);
    const said = await line();
    pathAt.push({ stop, ...seen, line: said.shown });
    if (stop === 2) await shoot("tab-order");
    await press("Next stop");
  }
  console.log("tab order:", JSON.stringify(pathAt));
  for (const at of pathAt) {
    check(at.covered.length === 0, `at stop ${at.stop} a number covers ${at.covered.join(", ")}`);
  }
  const inPath = await line();
  check(
    inPath.shown === "All findings › Tab order" && /^\d+\/\d+$/.test(inPath.counter ?? ""),
    `the page line reads "${inPath.shown}" and "${inPath.counter}" in the tab order`,
  );
  const pathButtons = inPath.buttons;
  check(
    ["Previous stop", "Next stop", "Exit"].every((b) => pathButtons.includes(b)),
    `the tab order line offers ${pathButtons.join(", ")}`,
  );
  await panel.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const reach = await panel.evaluate(() => {
    const next = document.querySelector('[data-page-line] button[aria-label="Next stop"]');
    const r = next.getBoundingClientRect();
    return { top: r.top, scrolled: window.scrollY };
  });
  check(
    reach.scrolled > 0 && reach.top >= 0 && reach.top < 120,
    `the stop arrows left the screen when the panel scrolled: ${JSON.stringify(reach)}`,
  );
  await press("Show complete path");
  const whole = await marks(NAV);
  console.log("the whole path:", JSON.stringify(whole));
  check(whole.covered.length === 0, `the whole path covers ${whole.covered.join(", ")}`);

  const followNote = () =>
    panel.evaluate(() => document.getElementById("follow-note")?.textContent ?? null);
  const following = () =>
    panel.evaluate(() => {
      const label = [...document.querySelectorAll("label")].find(
        (l) => l.textContent.trim() === "Follow my keyboard",
      );
      return label?.querySelector("input").checked ?? null;
    });
  await press("Follow my keyboard");
  const hint = await followNote();
  await page.bringToFront();
  await page.focus('nav a[href="/catalogue"]');
  await wait(500);
  const followed = [(await line()).counter];
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Tab");
    await wait(500);
    followed.push((await line()).counter);
  }
  await page.evaluate(() => {
    const extra = document.createElement("button");
    extra.id = "not-recorded";
    extra.textContent = "Not recorded";
    document.querySelector("header").append(extra);
    extra.focus();
  });
  await wait(500);
  const outside = { note: await followNote(), counter: (await line()).counter };
  await page.evaluate(() => document.getElementById("not-recorded").remove());
  await press("Follow my keyboard");
  await page.focus('nav a[href="/catalogue"]');
  await wait(500);
  const afterOff = (await line()).counter;
  console.log("following the keyboard:", JSON.stringify({ hint, followed, outside, afterOff }));
  check(
    hint === "Press Tab on the page. The current stop follows the focus.",
    `turning on Follow my keyboard said ${hint}`,
  );
  check(
    followed.every((c, i) => c?.startsWith(`${i + 1}/`)),
    `the stop did not follow Tab on the page: ${followed.join(", ")}`,
  );
  check(
    outside.note === "The element with focus is not in the recorded tab order." &&
      outside.counter === followed[2],
    `focus outside the recorded order gave ${JSON.stringify(outside)}`,
  );
  check(afterOff === followed[2], "the stop still followed the focus after the option was off");

  await press("Follow my keyboard");
  await press("Exit");
  await press("Inspect tab order");
  check((await following()) === false, "Follow my keyboard stayed on after leaving the tab order");
  await press("Exit");
  const exited = await line();
  check(exited.shown.startsWith("All findings ·"), `after Exit the line reads ${exited.shown}`);

  await press("Clear");
  const cleared = { page: await marks([]), line: await line() };
  console.log("after Clear:", JSON.stringify(cleared));
  check(!cleared.page.drawn, "Clear left marks on the page");
  check(
    cleared.line.shown === "Nothing marked",
    `after Clear the line reads ${cleared.line.shown}`,
  );
  await press("All findings");
  check((await marks([])).drawn, "All findings did not draw the overview again");

  const trace = () =>
    page.evaluate(() => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelector("#accesscheck-overlay")?.remove();
      const style = document.getElementById("accesscheck-preview");
      const bar = document
        .getElementById("accesscheck-preview-bar")
        ?.shadowRoot?.querySelector(".bar");
      const fixed = (style?.textContent ?? "")
        .split("\n")
        .filter((rule) => rule.includes(" {"))
        .map((rule) => rule.split(" {")[0])
        .filter((selector) => selector && !selector.includes(":"))
        .flatMap((selector) => [...document.querySelectorAll(selector)])
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight);
      const box = bar?.getBoundingClientRect();
      return {
        html: clone.outerHTML,
        style: style !== null,
        css: style?.textContent ?? "",
        bar: bar?.textContent ?? null,
        covers: box
          ? fixed.some(
              (r) =>
                box.left < r.right &&
                r.left < box.right &&
                box.top < r.bottom &&
                r.top < box.bottom,
            )
          : false,
        undo: box
          ? (() => {
              const r = bar.querySelector("button").getBoundingClientRect();
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            })()
          : null,
        muted: getComputedStyle(document.querySelector("main p.muted")).color,
      };
    });
  const openFinding = (id) =>
    panel.evaluate(async (key) => {
      const row = document.getElementById(`finding-${key}`);
      if (!row) throw new Error(`no finding ${key} in the panel`);
      row.closest("details")?.setAttribute("open", "");
      const button = row.querySelector("h3 > button");
      if (button.getAttribute("aria-expanded") !== "true") button.click();
      await new Promise((r) => setTimeout(r, 700));
    }, id);
  const panelSays = () =>
    panel.evaluate(() => ({
      said: [...document.querySelectorAll('p[role="status"]')].map((p) => p.textContent),
      offer: [...document.querySelectorAll("button")].some(
        (b) => b.textContent === "Preview on this page",
      ),
      pressed: [...document.querySelectorAll("button[aria-pressed]")]
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent),
      measured:
        document.querySelector('[id="finding-wcag:color-contrast"] section')?.textContent ?? "",
    }));

  const gone = () =>
    page
      .waitForFunction(
        () =>
          !document.getElementById("accesscheck-preview") &&
          !document.getElementById("accesscheck-preview-bar"),
        null,
        { timeout: 3000 },
      )
      .catch(() => {});

  const clean = await trace();
  await openFinding("wcag:color-contrast");
  await press("Preview on this page");
  const on = { page: await trace(), panel: await panelSays() };
  console.log(
    "previewing the contrast fix:",
    JSON.stringify({ ...on, page: { ...on.page, html: undefined } }),
  );
  await shoot("preview");
  check(
    on.page.style && on.page.muted !== clean.muted,
    "the preview did not change the color on the page",
  );
  check(
    /^AccessCheck · Previewing fix \d+ on this page · nothing is savedUndo$/.test(
      on.page.bar ?? "",
    ),
    `the page bar reads ${on.page.bar}`,
  );
  check(!on.page.covers, "the page bar covers an element being fixed");
  check(on.panel.pressed.includes("After"), "After is not pressed while previewing");
  check(
    on.panel.measured.includes("Previewing the change on this page."),
    "the measured ratio does not say it is a preview",
  );
  check(
    on.panel.said.some((t) => /^Previewing fix \d+ on this page\. Nothing is saved\.$/.test(t)),
    "turning the preview on was not announced",
  );

  await press("Before");
  const before = { page: await trace(), panel: await panelSays() };
  check(before.page.muted === clean.muted, "Before still shows the new color");
  check(before.panel.said.includes("Showing the page before the fix."), "Before was not announced");
  await press("After");
  check((await trace()).muted === on.page.muted, "After did not bring the new color back");

  await press("Undo");
  await gone();
  const undone = { page: await trace(), panel: await panelSays() };
  check(undone.page.html === clean.html, "Undo left the page different from how it was");
  check(!undone.page.style && undone.page.bar === null, "Undo left the style or the bar behind");
  check(undone.panel.offer, "after Undo the panel does not offer the preview again");
  check(
    undone.panel.said.includes("Preview undone. The page is as it was."),
    "Undo was not announced",
  );

  await press("Preview on this page");
  await page.reload({ waitUntil: "load" });
  await wait(1200);
  const reloaded = { page: await trace(), panel: await panelSays() };
  check(!reloaded.page.style && reloaded.page.bar === null, "the preview survived a reload");
  check(reloaded.panel.offer, "after a reload the panel still shows the preview as on");

  const fresh = await trace();
  await press("Preview on this page");
  const other = await ctx.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await gone();
  const switched = { page: await trace(), panel: await panelSays() };
  check(switched.page.html === fresh.html, "the preview stayed on the page after the tab changed");
  check(switched.panel.offer, "after changing tab the panel still shows the preview as on");
  await page.bringToFront();
  await other.close();
  await wait(600);

  await press("Preview on this page");
  const atBar = await trace();
  await page.mouse.click(atBar.undo.x, atBar.undo.y);
  await gone();
  const fromBar = { page: await trace(), panel: await panelSays() };
  check(fromBar.page.html === fresh.html, "Undo on the page left something behind");
  check(fromBar.panel.offer, "Undo on the page did not reach the panel");

  await openFinding("keyboard:focus-not-visible");
  await press("Preview on this page");
  const focus = await trace();
  check(/:focus-visible \{/.test(focus.css), `the focus preview injected ${focus.css}`);
  await press("Try it in the tab order");
  const tried = await line();
  console.log("trying the focus fix in the tab order:", JSON.stringify({ css: focus.css, tried }));
  await shoot("preview-focus");
  check(tried.shown === "All findings › Tab order", `Try it opened ${tried.shown}`);
  await press("Exit");
  await press("Undo");
  await gone();
  const afterFocus = await trace();
  check(afterFocus.html === fresh.html, "the focus preview left something behind");

  await page.evaluate(() => {
    document.querySelector(".cart").setAttribute("aria-label", "Basket");
    document.documentElement.removeAttribute("lang");
  });
  await openFinding("wcag:color-contrast");
  await press("Preview on this page");
  check((await trace()).style, "the preview did not start before auditing again");
  await press("Audit again");
  await panel.waitForFunction(() => document.getElementById("since-heading") !== null, null, {
    timeout: 20000,
  });
  await wait(600);
  const reaudited = await trace();
  check(
    !reaudited.style && reaudited.bar === null,
    "the preview was still on the page after auditing again",
  );
  check(
    await panel.evaluate(() => document.getElementById("finding-wcag:color-contrast") !== null),
    "the audit after a preview did not read the real colors",
  );
  const since = await panel.evaluate(() => {
    const section = document.getElementById("since-heading").closest("section");
    return {
      line: section.querySelector("p").textContent,
      cleared: [...section.querySelectorAll("li")].map((li) => li.textContent),
      marked: [...document.querySelectorAll('section[data-group="fix"] li')]
        .filter((li) => [...li.querySelectorAll("h3 span")].some((s) => s.textContent === "new"))
        .map((li) => li.id),
    };
  });
  console.log("since the last audit:", JSON.stringify(since));
  await shoot("since");
  check(
    /^1 cleared, 1 new, \d+ still to fix\. (Still at|Now at) /.test(since.line),
    `the comparison says ${since.line}`,
  );
  check(
    since.cleared.some((t) => /cleared, was \d+$/.test(t)),
    "the cleared finding does not say which number it was",
  );
  check(
    since.marked.length === 1 && since.marked[0] === "finding-wcag:html-has-lang",
    `the list marks ${since.marked.join(", ") || "nothing"} as new`,
  );

  await openFinding("wcag:color-contrast");
  await press("Preview on this page");
  check((await trace()).style, "the preview did not start before closing the panel");
  await panel.close();
  await gone();
  const closed = await trace();
  check(!closed.style && closed.bar === null, "the preview stayed after the panel closed");
} finally {
  await ctx.close();
}

if (failures.length > 0) {
  console.error("\nFAILED:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("\nthe marks on the page and the panel point at each other");
}
