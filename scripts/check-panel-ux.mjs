import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { openPanelWindow } from "./panel-window.mjs";

const LONG = "x".repeat(400);
const PAGES = {
  "/plain": `<main><h1>Plain</h1><a href="/a">One</a><button>Two</button></main>`,
  "/long": `<main><h1>Long</h1>
    <div id="${LONG}"><section><article><div><span><a href="/deep?token=${LONG}"
      style="outline:none" title="${LONG}" aria-label="${LONG}">Deeply buried link</a></span></div></article></section></div>
  </main>`,
  "/several": `<main><h1>Several</h1><img src="/pic.png">
    <p style="color:#bbb;background:#fff">Low contrast</p><input type="text">
    <p style="color:#777;background-image:linear-gradient(#fff,#ddd)">Over a gradient</p></main>
    <p>Outside every landmark</p>`,
  "/many": `<main><h1>Many</h1>${Array.from(
    { length: 260 },
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
  const walkFocusPath = async () => {
    await sw.evaluate(async () => {
      await globalThis.__accessCheckDeepAudit();
      await new Promise((r) => setTimeout(r, 800));
    });
  };

  const audit = async (path) => {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await globalThis.__accessCheckAuditTab(tab);
      await new Promise((r) => setTimeout(r, 600));
    });
  };

  const openPanel = async (width) => {
    const panel = await openPanelWindow(ctx, sw);
    await panel.setViewportSize({ width, height: 800 });
    await panel.waitForFunction(() => document.querySelector("main") !== null, null, {
      timeout: 20000,
    });
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

  for (const width of [320, 400]) {
    const zoomed = await openPanel(width);
    await zoomed.evaluate(() => {
      document.documentElement.style.zoom = "200%";
    });
    const atZoom = await zoomed.evaluate(() => {
      const doc = document.documentElement;
      const limit = doc.clientWidth;
      const past = [...document.querySelectorAll("*")]
        .filter((el) => el.getBoundingClientRect().right > limit + 0.5)
        .map(
          (el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`,
        );
      return { overflow: doc.scrollWidth - limit, past: [...new Set(past)].slice(0, 4) };
    });
    console.log(`at ${width}px and 200% zoom:`, JSON.stringify(atZoom));
    check(
      atZoom.overflow <= 1,
      `the panel overflows ${width}px at 200% zoom by ${atZoom.overflow}px (${atZoom.past.join(", ")})`,
    );
    await zoomed.close();
  }

  const panel = await openPanel(400);
  const keyboard = await panel.evaluate(() => {
    const focusable = [
      ...document.querySelectorAll("button, summary, select, a[href], [tabindex]"),
    ].filter((el) => !el.disabled && el.offsetParent !== null);
    const ringless = [];
    for (const el of focusable) {
      el.focus();
      const s = getComputedStyle(el);
      const brackets = getComputedStyle(el, "::after").backgroundImage;
      const ring =
        s.outlineStyle !== "none" || s.boxShadow !== "none" || (brackets && brackets !== "none");
      if (!ring) ringless.push(el.textContent.trim().slice(0, 30) || el.tagName);
    }
    return { count: focusable.length, ringless };
  });
  console.log("keyboard:", JSON.stringify(keyboard));
  check(keyboard.count > 5, "the panel exposes almost nothing to the keyboard");
  check(keyboard.ringless.length === 0, `no focus ring on: ${keyboard.ringless.join(", ")}`);

  const shift = await panel.evaluate(async () => {
    const row = document.querySelector("h3 > button");
    if (!row) return { skipped: true };
    const before = row.getBoundingClientRect().top;
    row.click();
    await new Promise((r) => setTimeout(r, 120));
    return { skipped: false, moved: Math.abs(row.getBoundingClientRect().top - before) };
  });
  console.log("opening a finding:", JSON.stringify(shift));
  if (!shift.skipped) check(shift.moved <= 1, `the row jumped ${shift.moved}px when opened`);

  await panel.close();

  await audit("/several");
  const severalPanel = await openPanel(400);
  const stepping = await severalPanel.evaluate(async () => {
    const rows = () => [
      ...document.querySelectorAll('section[aria-labelledby="group-fix"] h3 > button'),
    ];
    const byText = (text) =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent.replace(/[←→]/g, "").trim() === text,
      );
    const opened = () => rows().findIndex((r) => r.getAttribute("aria-expanded") === "true");
    rows()[0]?.click();
    await new Promise((r) => setTimeout(r, 120));
    const controls = ["Locate on page", "Previous finding", "Next finding"]
      .map(byText)
      .filter((b) => b && !b.disabled);
    const ringless = controls
      .filter((b) => {
        b.focus();
        const s = getComputedStyle(b);
        const brackets = getComputedStyle(b, "::after").backgroundImage;
        return (
          s.outlineStyle === "none" && s.boxShadow === "none" && (!brackets || brackets === "none")
        );
      })
      .map((b) => b.textContent.trim());
    const total = rows().length;
    const firstPrevious = byText("Previous finding")?.disabled ?? null;
    byText("Next finding")?.focus();
    document.activeElement.click();
    await new Promise((r) => setTimeout(r, 150));
    const afterNext = opened();
    const focusedRow = rows().indexOf(document.activeElement);
    while (byText("Next finding") && !byText("Next finding").disabled) {
      byText("Next finding").click();
      await new Promise((r) => setTimeout(r, 60));
    }
    return {
      total,
      ringless,
      firstPrevious,
      afterNext,
      focusedRow,
      last: opened(),
      lastNextDisabled: byText("Next finding")?.disabled ?? null,
    };
  });
  console.log("stepping between problems:", JSON.stringify(stepping));
  check(stepping.ringless.length === 0, `no focus ring on: ${stepping.ringless.join(", ")}`);
  check(stepping.total > 1, `the several-problem fixture produced ${stepping.total}`);
  if (stepping.total > 1) {
    check(stepping.firstPrevious === true, "Previous finding is live on the first finding");
    check(stepping.afterNext === 1, `Next finding opened finding ${stepping.afterNext + 1}`);
    check(stepping.focusedRow === 1, "Next finding did not move focus to the finding it opened");
    check(stepping.last === stepping.total - 1, "Next finding never reached the last finding");
    check(stepping.lastNextDisabled === true, "Next finding is live on the last finding");
  }

  const groups = await severalPanel.evaluate(async () => {
    const heading = (group) => document.getElementById(`group-${group}`);
    const read = (group) => heading(group)?.textContent.trim() ?? null;
    const holder = (group) => heading(group)?.closest("details") ?? null;
    const band = [...document.querySelectorAll('[aria-labelledby="verdict-heading"] span')].map(
      (s) => s.textContent.trim(),
    );
    const said = (label) =>
      Number(
        band.find((text) => new RegExp(`^\\d+ ${label}$`).test(text))?.match(/^\d+/)?.[0] ?? 0,
      );
    const check = holder("check");
    const closedAtFirst = {
      check: check ? !check.open : null,
      recommend: holder("recommend") ? !holder("recommend").open : null,
    };
    check?.querySelector("summary").click();
    await new Promise((r) => setTimeout(r, 60));
    const review = check
      ?.querySelector('li[data-kind="manual-review"]')
      ?.querySelector("h3 > button");
    review?.click();
    await new Promise((r) => setTimeout(r, 120));
    const section = review?.closest("li")?.querySelector("section") ?? null;
    const detail = section?.innerText ?? "";
    return {
      fix: read("fix"),
      check: read("check"),
      recommend: read("recommend"),
      closedAtFirst,
      band: { fix: said("to fix"), check: said("to check by hand") },
      reviewOpened: !!review,
      howToCheck: /^How to check$/im.test(detail),
      steps: section?.querySelectorAll("ol.list-decimal li").length ?? 0,
      locate: /^Locate on page$/m.test(detail),
      whatToChange: /^Change$/m.test(detail),
      markerNote: /not pictured/.test(document.body.innerText),
    };
  });
  console.log("the queue's groups:", JSON.stringify(groups));
  const listed = (label) => Number(label?.match(/(\d+)\s*$/)?.[1] ?? 0);
  const counted = await sw.evaluate(async () => {
    const { panelState } = await chrome.storage.session.get("panelState");
    const r = panelState.state.result;
    return { ...r.counts, manualReview: r.incomplete.length };
  });
  check(
    groups.band.fix === listed(groups.fix),
    `the top says ${groups.band.fix} to fix, the queue lists ${listed(groups.fix)}`,
  );
  check(
    groups.band.check === listed(groups.check),
    `the top says ${groups.band.check} to check by hand, the queue lists ${listed(groups.check)}`,
  );
  check(groups.fix?.startsWith("To fix"), "there is no To fix group");
  check(groups.closedAtFirst.check === true, "To check by hand is not closed at first");
  check(groups.closedAtFirst.recommend === true, "Recommendations is not closed at first");
  check(
    listed(groups.check) === counted.manualReview + (counted.needsReview ?? 0),
    `To check by hand lists ${listed(groups.check)}, the counts say ${
      counted.manualReview + (counted.needsReview ?? 0)
    }`,
  );
  check(counted.manualReview > 0, "the fixture produced no manual review to list");
  check(
    listed(groups.recommend) === counted.bestPractice,
    `Recommendations lists ${listed(groups.recommend)}, the counts say ${counted.bestPractice}`,
  );
  check(groups.reviewOpened, "no manual review row in To check by hand");
  check(groups.howToCheck && groups.steps > 0, "a manual review does not say how to check it");
  check(!groups.whatToChange, "a manual review is framed as something to change");
  check(groups.locate, "a manual review cannot be located on the page");
  check(!groups.markerNote, "a row still speaks about the screenshot");
  await severalPanel.close();

  await audit("/long");
  const longPanel = await openPanel(400);
  const long = await longPanel.evaluate(async () => {
    const row = document.querySelector("h3 > button");
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
  const keepPlace = await openPanel(400);
  await keepPlace.setViewportSize({ width: 400, height: 360 });
  const staysPut = async (label) => {
    const before = await keepPlace.evaluate((text) => {
      window.scrollTo(0, 0);
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      );
      if (!button) return null;
      window.scrollTo(0, Math.max(0, button.getBoundingClientRect().top - 120));
      document.getElementById("verdict-heading").dataset.probe = text;
      button.parentElement.dataset.probeBox = text;
      const y = window.scrollY;
      const top = button.parentElement.getBoundingClientRect().top;
      button.click();
      return { y, top };
    }, label);
    if (before === null) return { label, missing: true };
    await keepPlace.waitForFunction(
      () => document.body.textContent.includes("Walking the focus path"),
      null,
      { timeout: 30000 },
    );
    await keepPlace.waitForFunction(
      () =>
        !document.body.textContent.includes("Walking the focus path") &&
        document.getElementById("focus-heading") !== null,
      null,
      { timeout: 30000 },
    );
    return keepPlace.evaluate(
      ({ text, y, top }) => ({
        label: text,
        missing: false,
        before: y,
        after: window.scrollY,
        boxBefore: top,
        boxAfter:
          document.querySelector(`[data-probe-box="${text}"]`)?.getBoundingClientRect().top ?? null,
        sameReport: document.getElementById("verdict-heading")?.dataset.probe === text,
        said:
          document
            .querySelector('[aria-labelledby="verdict-heading"] [role="status"]')
            ?.textContent.trim() ?? null,
      }),
      { text: label, ...before },
    );
  };
  const walkedFrom = await staysPut("Check keyboard");
  const continuedFrom = await staysPut("Continue where it stopped");
  console.log("checking the keyboard in place:", JSON.stringify([walkedFrom, continuedFrom]));
  for (const moved of [walkedFrom, continuedFrom]) {
    check(!moved.missing, `there is no ${moved.label} action to press`);
    if (moved.missing) continue;
    check(moved.before > 100, `${moved.label} was pressed without the panel scrolled`);
    check(moved.sameReport, `${moved.label} replaced the reading instead of keeping it`);
    check(moved.after > 100, `${moved.label} sent the panel back to the top`);
    check(
      moved.boxAfter !== null && Math.abs(moved.boxAfter - moved.boxBefore) <= 2,
      `${moved.label} moved the keyboard check on screen from ${moved.boxBefore}px to ${moved.boxAfter}px`,
    );
    check(
      /^This round checked \d+ stops?\. \d+ keyboard findings? (was|were) added to the list\./.test(
        moved.said ?? "",
      ),
      `${moved.label} said nothing about what the round did: ${moved.said}`,
    );
  }
  check(
    walkedFrom.said?.startsWith("This round checked 200 stops."),
    `the first round reported ${walkedFrom.said}`,
  );
  check(
    continuedFrom.said?.startsWith("This round checked 60 stops."),
    `the second round reported ${continuedFrom.said}`,
  );

  const shown = await keepPlace.evaluate(async () => {
    window.scrollTo(0, 0);
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Show keyboard findings",
    );
    if (!button) return { button: false };
    button.click();
    await new Promise((r) => setTimeout(r, 300));
    const open = document.querySelector("button[aria-expanded='true']");
    const box = open?.getBoundingClientRect();
    return {
      button: true,
      kind: open?.closest("li")?.dataset.kind === "keyboard" ? "keyboard" : null,
      focused: document.activeElement === open,
      inView: !!box && box.top >= 0 && box.top < innerHeight,
    };
  });
  console.log("showing the keyboard problems:", JSON.stringify(shown));
  check(shown.button, "a round that found keyboard problems offers no way to them");
  check(!!shown.kind, "Show keyboard findings opened something other than a keyboard finding");
  check(shown.focused, "Show keyboard findings did not move focus to the finding");
  check(shown.inView, "Show keyboard findings left the finding out of view");
  await keepPlace.close();

  await audit("/many");
  await walkFocusPath();
  const manyPanel = await openPanel(400);
  const many = await manyPanel.evaluate(async () => {
    const row = [...document.querySelectorAll("h3 > button")].find((b) =>
      /focus/i.test(b.textContent),
    );
    row?.click();
    await new Promise((r) => setTimeout(r, 250));
    const counter = () =>
      [...document.querySelectorAll("span")]
        .map((h) => h.textContent.trim())
        .map((t) => t.match(/^Occurrence \d+ of \d+/)?.[0])
        .find(Boolean);
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
    const row = document.querySelector("h3 > button");
    row?.click();
    await new Promise((r) => setTimeout(r, 150));
    const bar = document.querySelector("h1").parentElement;
    const atTop = Math.round(bar.getBoundingClientRect().top);
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 60));
    const scrolled = Math.round(window.scrollY);
    const afterScroll = Math.round(bar.getBoundingClientRect().top);
    const reaudit = [...bar.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Audit again",
    );
    const box = reaudit?.getBoundingClientRect();
    const reauditInView = !!box && box.top >= 0 && box.bottom <= innerHeight;
    const chip = [...bar.querySelectorAll("button")].at(-1);
    chip?.click();
    await new Promise((r) => setTimeout(r, 60));
    return { atTop, scrolled, afterScroll, reauditInView, backTo: Math.round(window.scrollY) };
  });
  console.log("the header while scrolling:", JSON.stringify(pinned));
  check(pinned.scrolled > 0, "the fixture report was too short to scroll");
  check(pinned.afterScroll === pinned.atTop, `the header drifted to ${pinned.afterScroll}px`);
  check(pinned.backTo === 0, `the score chip left the reader at ${pinned.backTo}px`);
  check(pinned.reauditInView, "Audit again is out of view once the reader scrolls down");

  const scannedAt = () =>
    sw.evaluate(async () => {
      const { panelState } = await chrome.storage.session.get("panelState");
      return panelState?.state?.result?.scannedAt ?? null;
    });
  const firstReading = await scannedAt();
  await page.bringToFront();
  const focusedReaudit = await live.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const button = [...document.querySelectorAll("[class*='sticky'] button")].find(
      (b) => b.textContent.trim() === "Audit again",
    );
    button?.focus();
    return document.activeElement === button;
  });
  await live.keyboard.press("Enter");
  let secondReading = await scannedAt();
  for (let i = 0; i < 100 && (secondReading === null || secondReading === firstReading); i++) {
    await live.waitForTimeout(200);
    secondReading = await scannedAt();
  }
  await live.waitForFunction(() => document.getElementById("group-fix") !== null, null, {
    timeout: 20000,
  });
  console.log(
    "auditing again from the bar:",
    JSON.stringify({ focusedReaudit, firstReading, secondReading }),
  );
  check(focusedReaudit, "Audit again cannot take keyboard focus");
  check(
    secondReading !== null && secondReading !== firstReading,
    "pressing Audit again from the keyboard did not audit the tab again",
  );
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

  const AXE = readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");
  const contrastFailures = (panel) =>
    panel.evaluate(async (source) => {
      if (!window.axe) (0, eval)(source);
      const { violations } = await window.axe.run(document, { runOnly: ["color-contrast"] });
      return violations.flatMap((v) =>
        v.nodes.map((n) => `${n.target.join(" ")}: ${n.any[0]?.message ?? v.id}`),
      );
    }, AXE);

  await audit("/long");
  await walkFocusPath();
  const inspecting = await openPanel(400);
  await inspecting.evaluate(async () => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Inspect tab order")
      ?.click();
    await new Promise((r) => setTimeout(r, 600));
  });
  const ringless = await inspecting.evaluate(() =>
    document.body.innerText.includes("nothing shows focus"),
  );
  const whileInspecting = await contrastFailures(inspecting);
  await page.goto(`${origin}/plain`, { waitUntil: "domcontentloaded" });
  await walkFocusPath();
  const keyboardError = await inspecting.evaluate(
    () => document.querySelector('[role="alert"]')?.textContent ?? null,
  );
  const withError = await contrastFailures(inspecting);
  console.log(
    "contrast of the panel's own text:",
    JSON.stringify({ ringless, whileInspecting, keyboardError, withError }),
  );
  check(ringless, "the inspection never reached a stop where nothing shows focus");
  check(
    whileInspecting.length === 0,
    `text in the inspection fails contrast: ${whileInspecting.join("; ")}`,
  );
  check(keyboardError !== null, "a keyboard check on a page that moved on said nothing");
  check(
    withError.length === 0,
    `the keyboard check's error fails contrast: ${withError.join("; ")}`,
  );
  await inspecting.close();

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
