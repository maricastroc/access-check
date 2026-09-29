import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { FIXTURE } from "./results-fixture.mjs";

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

const PORT = 4173 + Math.floor(Math.random() * 400);
const DIST = ".next-results-ux";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: DIST };

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("npx", args, { cwd: process.cwd(), stdio: "pipe", env });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (out += c));
    child.on("exit", (code) => (code === 0 ? resolve(out) : reject(new Error(out.slice(-800)))));
  });

const tsconfig = readFileSync("tsconfig.json", "utf8");

console.log("building the app the gate will drive…");
await run(["next", "build"]);

const server = spawn("npx", ["next", "start", "--port", String(PORT)], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  env,
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

const origin = `http://127.0.0.1:${PORT}`;

for (let i = 0; i < 60; i += 1) {
  const up = await fetch(origin, { method: "HEAD" }).then(
    () => true,
    () => false,
  );
  if (up) break;
  await new Promise((r) => setTimeout(r, 500));
}
const stream = (result) =>
  [
    JSON.stringify({ type: "phase", phase: "auditing" }),
    JSON.stringify({ type: "core", result }),
    JSON.stringify({ type: "result", result }),
    "",
  ].join("\n");

const browser = await chromium.launch({ channel: "chromium", headless: true });

const open = async (width, locale = "en") => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    locale: locale === "pt-BR" ? "pt-BR" : "en-US",
  });
  const page = await context.newPage();
  await page.route("**/api/scan", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: stream({ ...FIXTURE, locale }),
    }),
  );
  await page.goto(`${origin}/results?url=${encodeURIComponent(FIXTURE.url)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForFunction(
    () => /To fix|A corrigir|Findings|Problemas/.test(document.body.textContent ?? ""),
    null,
    {
      timeout: 60_000,
    },
  );
  return { page, context };
};

const overflow = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const past = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 30)}`);
    return { overflow: doc.scrollWidth - doc.clientWidth, past };
  });

const legend = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("span")]
        .map((s) => s.textContent.trim())
        .find((t) => /^Screenshot|^Captura/.test(t)) ?? "",
  );

const banner = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("p")]
      .filter((p) => p.className.includes("bottom-0"))
      .map((p) => p.textContent.trim())
      .join(" "),
  );

const openStops = (page) =>
  page.evaluate(async () => {
    const summary = [...document.querySelectorAll("summary")].find((s) =>
      /focus-path stops|paradas/i.test(s.textContent ?? ""),
    );
    summary?.click();
    await new Promise((r) => setTimeout(r, 300));
    return Boolean(summary);
  });

const pickStop = (page, n) =>
  page.evaluate(async (stop) => {
    const row = document.getElementById(`focus-stop-row-${stop}`);
    const button = row?.querySelector("button") ?? row;
    button?.click();
    await new Promise((r) => setTimeout(r, 400));
    return Boolean(button);
  }, n);

const backButton = (page) =>
  page.evaluate(() =>
    Boolean(
      [...document.querySelectorAll("button")].find((b) =>
        /Back to the first screenshot|Voltar à primeira captura/.test(b.textContent ?? ""),
      ),
    ),
  );

try {
  for (const width of [1280, 1440]) {
    const { page, context } = await open(width);
    const at = await overflow(page);
    console.log(`at ${width}px:`, JSON.stringify(at));
    check(at.overflow <= 0, `the results page overflows ${width}px by ${at.overflow}px`);

    await page.evaluate(() => {
      document.documentElement.style.zoom = "200%";
    });
    await page.waitForTimeout(200);
    const zoomed = await overflow(page);
    console.log(`at ${width}px and 200% zoom:`, JSON.stringify(zoomed));
    check(
      zoomed.overflow <= 0,
      `the results page overflows ${width}px at 200% zoom by ${zoomed.overflow}px (${zoomed.past.join(", ")})`,
    );
    await context.close();
  }

  {
    const { page, context } = await open(1440);
    const top = await page.evaluate(() => {
      const heading = [...document.querySelectorAll("section")].find((s) =>
        /Where this page stands/i.test(s.textContent ?? ""),
      );
      const firstRow = [...document.querySelectorAll("button")].find((b) => b.querySelector("h3"));
      const about = [...document.querySelectorAll("details")].find((d) =>
        /About this audit/.test(d.querySelector("summary")?.textContent ?? ""),
      );
      const text = document.body.innerText;
      return {
        bandHeight: heading ? Math.round(heading.getBoundingClientRect().height) : null,
        firstRow: firstRow ? Math.round(firstRow.getBoundingClientRect().top + scrollY) : null,
        work: /\d+ to fix|\d+ to check by hand/.test(heading?.textContent ?? ""),
        chips: /fails|No failures|not evaluated/i.test(heading?.textContent ?? ""),
        share: /of what is left|What to fix first/i.test(text),
        partialAtTop: [...document.querySelectorAll("h3")].some(
          (h) => /^Partial report$/.test(h.textContent.trim()) && !h.closest("details"),
        ),
        about: about
          ? {
              open: about.open,
              summary: about.querySelector("summary").textContent,
              provenance: /Provenance/i.test(about.textContent),
              passed: /automated checks passed/.test(about.textContent),
            }
          : null,
        provenanceOutside: [...document.querySelectorAll("*")].some(
          (el) =>
            el.children.length === 0 &&
            /^Provenance$/i.test(el.textContent.trim()) &&
            !el.closest("details"),
        ),
      };
    });
    console.log("the top of the results:", JSON.stringify(top));
    check(
      top.bandHeight !== null && top.bandHeight <= 200,
      `the summary band is ${top.bandHeight}px tall`,
    );
    check(
      top.firstRow !== null && top.firstRow < 450,
      `the first finding starts at ${top.firstRow}px`,
    );
    check(top.work, "the top does not say how much work is left");
    check(top.chips, "the WCAG chips left the top");
    check(!top.share, "the share of what is left is still on the page");
    check(!top.partialAtTop, "the partial report still opens the page");
    check(top.about && !top.about.open, "About this audit is missing or open by default");
    check(
      /Partial report/.test(top.about?.summary ?? ""),
      "About this audit hides that the report is partial",
    );
    check(
      top.about?.provenance && top.about?.passed,
      "About this audit lost the provenance or the passed checks",
    );
    check(!top.provenanceOutside, "the provenance still sits beside the screenshot");
    await context.close();
  }

  const queueOf = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-group]")].map((g) => ({
        group: g.dataset.group,
        heading: g.querySelector("h2")?.textContent.trim() ?? "",
        open: g.tagName === "DETAILS" ? g.open : true,
        rows: g.querySelectorAll("button h3").length,
      })),
    );

  {
    const { page, context } = await open(1440);
    const queue = await queueOf(page);
    const leftovers = await page.evaluate(() =>
      [...document.querySelectorAll("summary")].some((s) =>
        /manual-review items/i.test(s.textContent ?? ""),
      ),
    );
    await page.evaluate(() => {
      const check = document.querySelector('details[data-group="check"]');
      if (check) check.open = true;
    });
    await page.waitForTimeout(200);
    const review = await page.evaluate(async () => {
      const row = document.querySelector('details[data-group="check"] button');
      row?.click();
      await new Promise((r) => setTimeout(r, 400));
      const detail = row?.parentElement;
      return {
        howToCheck: /How to check/.test(detail?.textContent ?? ""),
        steps: detail?.querySelectorAll("ol li").length ?? 0,
        guessNote: /not counted as a failure/.test(detail?.textContent ?? ""),
      };
    });
    console.log("the work queue:", JSON.stringify({ queue, leftovers, review }));
    check(
      queue.map((g) => g.group).join() === "fix,check,recommend",
      `the queue groups are ${queue.map((g) => g.group).join()}`,
    );
    check(queue[0]?.heading === "To fix · 3", `the fix group reads ${queue[0]?.heading}`);
    check(
      queue[1]?.heading === "To check by hand · 1",
      `the check group reads ${queue[1]?.heading}`,
    );
    check(
      queue[2]?.heading === "Recommendations · 1",
      `the recommendations read ${queue[2]?.heading}`,
    );
    check(queue[0]?.open && queue[0]?.rows === 3, "the fix group is not open with its three rows");
    check(!queue[1]?.open && !queue[2]?.open, "a secondary group starts open");
    check(!leftovers, "the manual-review list still sits apart from the queue");
    check(review.howToCheck && review.steps > 0, "a manual review lost its steps to check");
    check(!review.guessNote, "a manual review is explained as a guess");
    await context.close();
  }

  {
    const { page, context } = await open(420);
    await page.evaluate(() =>
      [...document.querySelectorAll('[role="tab"]')]
        .find((b) => /Findings/.test(b.textContent ?? ""))
        ?.click(),
    );
    await page.waitForTimeout(300);
    const queue = await queueOf(page);
    console.log("the work queue on a phone:", JSON.stringify(queue));
    check(
      queue.map((g) => g.group).join() === "fix,check,recommend",
      `the phone queue groups are ${queue.map((g) => g.group).join()}`,
    );
    await context.close();
  }

  {
    const { page, context } = await open(1440, "pt-BR");
    const queue = await queueOf(page);
    console.log("the work queue in pt-BR:", JSON.stringify(queue.map((g) => g.heading)));
    check(
      queue.map((g) => g.heading).join(" | ") ===
        "A corrigir · 3 | Conferir à mão · 1 | Recomendações · 1",
      "the pt-BR queue headings are off",
    );
    await context.close();
  }

  const readDetail = (page, pattern) =>
    page.evaluate(async (source) => {
      const row = [...document.querySelectorAll("button")].find(
        (b) => b.querySelector("h3") && new RegExp(source, "i").test(b.textContent ?? ""),
      );
      row?.click();
      await new Promise((r) => setTimeout(r, 500));
      const detail = row?.nextElementSibling;
      if (!detail) return null;
      const parts = [...detail.querySelectorAll("h4")].map((h) => h.textContent.trim());
      const change = [...detail.querySelectorAll("section")].find((s) =>
        /^What to change/.test(s.querySelector("h4")?.textContent ?? ""),
      );
      const details = detail.querySelector("details");
      return {
        parts,
        sealInChange: /Fix tested/.test(change?.textContent ?? ""),
        detailsOpen: details?.open ?? null,
        showButton: [...detail.querySelectorAll("button")].some((b) =>
          /Show on screenshot/.test(b.textContent ?? ""),
        ),
      };
    }, pattern);

  {
    const { page, context } = await open(1440);
    const contrast = await readDetail(page, "contrast ratio");
    const under = await page.evaluate(() => {
      const frame = document.getElementById("evidence");
      return {
        elementAndCode: /Element and code/i.test(frame?.textContent ?? ""),
        code: Boolean(frame?.querySelector("pre, code")),
      };
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    const altText = await readDetail(page, "alternative text");
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => /Show on screenshot/.test(b.textContent ?? ""))
        ?.click(),
    );
    await page.waitForTimeout(800);
    const frameTop = await page.evaluate(() =>
      Math.round(document.getElementById("evidence")?.getBoundingClientRect().top ?? -1),
    );
    console.log("an opened finding:", JSON.stringify({ contrast, altText, under, frameTop }));
    check(
      contrast?.parts.join(" > ") === "Where > What to change > Why > Details",
      `the detail reads ${contrast?.parts.join(" > ")}`,
    );
    check(contrast?.sealInChange, "Fix tested sits outside what to change");
    check(contrast?.detailsOpen === false, "the details start open");
    check(altText?.showButton, "where does not lead to the screenshot");
    check(frameTop >= 0 && frameTop < 200, `Show on screenshot left the frame at ${frameTop}px`);
    check(
      !under.elementAndCode && !under.code,
      "the screenshot still repeats the element and code",
    );
    await context.close();
  }

  {
    const { page, context } = await open(420);
    await page.evaluate(() =>
      [...document.querySelectorAll('[role="tab"]')]
        .find((b) => /Findings/.test(b.textContent ?? ""))
        ?.click(),
    );
    await page.waitForTimeout(300);
    const altText = await readDetail(page, "alternative text");
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => /Show on screenshot/.test(b.textContent ?? ""))
        ?.click(),
    );
    await page.waitForTimeout(400);
    const tab = await page.evaluate(
      () => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? "",
    );
    console.log("an opened finding on a phone:", JSON.stringify({ altText, tab }));
    check(
      altText?.parts.join(" > ") === "Where > What to change > Why > Details",
      `the phone detail reads ${altText?.parts.join(" > ")}`,
    );
    check(/Screenshot/.test(tab), "Show on screenshot did not bring the phone to the screenshot");
    await context.close();
  }

  for (const width of [420, 800]) {
    const { page, context } = await open(width);
    const at = await overflow(page);
    console.log(`at ${width}px:`, JSON.stringify(at));
    check(at.overflow <= 0, `the results page overflows ${width}px by ${at.overflow}px`);
    await context.close();
  }

  const { page, context } = await open(1440);
  await openStops(page);

  await pickStop(page, 3);
  const first = {
    legend: await legend(page),
    banner: await banner(page),
    back: await backButton(page),
  };
  console.log("stop in the first capture:", JSON.stringify(first));
  check(/1200/.test(first.legend), `the first capture lost its label: ${first.legend}`);
  check(!first.back, "the first capture offers a way back to itself");
  check(first.banner === "", `the first capture explains itself away: ${first.banner}`);

  await pickStop(page, 12);
  const contextual = {
    legend: await legend(page),
    banner: await banner(page),
    back: await backButton(page),
  };
  console.log("stop in a contextual capture:", JSON.stringify(contextual));
  check(
    /900px/.test(contextual.legend),
    `the contextual capture is unlabelled: ${contextual.legend}`,
  );
  check(contextual.back, "a contextual capture offers no way back");
  check(contextual.banner === "", `a placed stop was explained away: ${contextual.banner}`);

  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => /Back to the first screenshot/.test(b.textContent ?? ""))
      ?.click();
  });
  await page.waitForTimeout(300);
  const returned = { legend: await legend(page), back: await backButton(page) };
  console.log("after going back:", JSON.stringify(returned));
  check(
    /1200/.test(returned.legend),
    `Back did not return to the first capture: ${returned.legend}`,
  );
  check(!returned.back, "Back stayed on screen after returning");

  await pickStop(page, 28);
  const scroller = {
    banner: await banner(page),
    boxes: await page.evaluate(
      () => document.querySelectorAll('[aria-label^="Focus stop"]').length,
    ),
  };
  console.log("stop inside a scroller:", JSON.stringify(scroller));
  check(
    /scrolling area/i.test(scroller.banner),
    `the scroller case says nothing: ${scroller.banner}`,
  );
  check(
    /at rest/i.test(scroller.banner),
    "the scroller case does not say why the position is not drawn",
  );
  check(
    !/#feed/.test(scroller.banner) || !/ > /.test(scroller.banner),
    "a css path leaked into the sentence",
  );

  await pickStop(page, 41);
  const missed = {
    legend: await legend(page),
    back: await backButton(page),
    panel: await page.evaluate(
      () =>
        [...document.querySelectorAll("section, div")]
          .map((d) => d.textContent ?? "")
          .filter((t) => /was not captured|não foi capturada/.test(t))
          .sort((a, b) => a.length - b.length)[0]
          ?.slice(0, 160) ?? "",
    ),
    image: await page.evaluate(() =>
      Boolean([...document.querySelectorAll("img")].some((i) => i.src.startsWith("data:image"))),
    ),
  };
  console.log("stop in a region the budget could not pay for:", JSON.stringify(missed));
  check(/3200px/.test(missed.legend), `the missed region kept another label: ${missed.legend}`);
  check(!missed.image, "a missed region still shows a screenshot underneath");
  check(/was not captured/i.test(missed.panel), `the missed region says nothing: ${missed.panel}`);
  check(/weight/i.test(missed.panel), `the missed region does not say why: ${missed.panel}`);
  check(missed.back, "a missed region offers no way back to the first capture");
  await context.close();

  const wide = await open(1560);
  const layout = await wide.page.evaluate(() => {
    const img = [...document.querySelectorAll("img")].find((i) => i.src.startsWith("data:image"));
    return {
      rail: Boolean(document.querySelector("div.bg-band.border-r")),
      overlayLabel: [...document.querySelectorAll("section, div")].some((d) =>
        /^OVERLAY$/i.test((d.firstElementChild?.textContent ?? "").trim()),
      ),
      shot: img ? Math.round(img.getBoundingClientRect().width) : 0,
    };
  });
  console.log("layout at 1560px:", JSON.stringify(layout));
  check(!layout.rail, "the overlay column is back");
  check(!layout.overlayLabel, "an OVERLAY heading is still on the page");
  check(
    layout.shot / 1200 >= 0.88,
    `the screenshot renders at ${Math.round((layout.shot / 1200) * 100)}%`,
  );

  const count = (page) =>
    page.evaluate(() => ({
      markers: document.querySelectorAll('[aria-label^="Marker "]').length,
      stops: document.querySelectorAll('[aria-label^="Focus stop"]').length,
    }));
  const press = (page, pattern) =>
    page.evaluate(async (source) => {
      const button = [...document.querySelectorAll("button")].find((b) =>
        new RegExp(source).test(b.textContent ?? ""),
      );
      button?.click();
      await new Promise((r) => setTimeout(r, 300));
      return Boolean(button);
    }, pattern);
  const openFinding = (page, pattern) =>
    page.evaluate(async (source) => {
      const row = [...document.querySelectorAll("button")].find(
        (b) => b.querySelector("h3") && new RegExp(source, "i").test(b.textContent ?? ""),
      );
      row?.click();
      await new Promise((r) => setTimeout(r, 400));
      return Boolean(row);
    }, pattern);

  const shown = await count(wide.page);
  await press(wide.page, "^Hide overlay$");
  const hidden = await count(wide.page);
  const hiddenLabel = await wide.page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) =>
      /^Show overlay$/.test(b.textContent ?? ""),
    ),
  );
  await press(wide.page, "^Show overlay$");
  const restored = await count(wide.page);
  console.log("overlay toggle:", JSON.stringify({ shown, hidden, hiddenLabel, restored }));
  check(shown.markers > 0, "nothing is marked before the toggle is touched");
  check(
    hidden.markers === 0 && hidden.stops === 0,
    "hiding the overlay left marks on the screenshot",
  );
  check(hiddenLabel, "the toggle does not offer to show the overlay again");
  check(restored.markers === shown.markers, "showing the overlay again lost marks");

  await openStops(wide.page);
  await pickStop(wide.page, 3);
  const onStop = await count(wide.page);
  await openFinding(wide.page, "alternative text");
  const onFinding = await count(wide.page);
  console.log("stop then finding:", JSON.stringify({ onStop, onFinding }));
  check(onStop.stops > 0, "picking a stop did not draw the focus path");
  check(onFinding.markers > 0, "picking a finding after a stop did not bring its marker back");
  check(onFinding.stops === 0, "picking a finding left the focus path drawn over it");
  await wide.context.close();

  const pt = await open(1440, "pt-BR");
  await openStops(pt.page);
  await pickStop(pt.page, 12);
  const ptLegend = await legend(pt.page);
  const ptBack = await pt.page.evaluate(() =>
    Boolean(
      [...document.querySelectorAll("button")].find((b) =>
        /Voltar à primeira captura/.test(b.textContent ?? ""),
      ),
    ),
  );
  await pickStop(pt.page, 28);
  const ptScroller = await banner(pt.page);
  console.log(
    "pt-BR:",
    JSON.stringify({ legend: ptLegend, back: ptBack, scroller: ptScroller.slice(0, 80) }),
  );
  check(/Captura da página/.test(ptLegend), `pt-BR kept the English legend: ${ptLegend}`);
  check(ptBack, "pt-BR has no way back");
  check(/área rolável/.test(ptScroller), `pt-BR scroller case is not translated: ${ptScroller}`);
  check(!/screenshot|Stop \d/i.test(ptScroller), `English leaked into pt-BR: ${ptScroller}`);
  await pt.context.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
  writeFileSync("tsconfig.json", tsconfig);
}

if (failures.length > 0) {
  console.error("\nFAILED:\n- " + failures.filter(Boolean).join("\n- "));
  process.exitCode = 1;
} else {
  console.log("\nthe results page holds up at every width, zoom and selection");
}
