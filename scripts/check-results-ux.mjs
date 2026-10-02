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
  page.evaluate(() => document.getElementById("capture-legend")?.textContent.trim() ?? "");

const caption = (page) =>
  page.evaluate(
    () => document.querySelector('#evidence p[role="status"]')?.textContent.trim() ?? "",
  );

const pickStop = (page, n) =>
  page.evaluate(async (stop) => {
    const button = document
      .getElementById("focus-heading")
      ?.parentElement?.querySelector(`button[data-stop="${stop}"]`);
    button?.click();
    await new Promise((r) => setTimeout(r, 400));
    return Boolean(button);
  }, n);

const backButton = (page) =>
  page.evaluate(() =>
    Boolean(
      [...document.querySelectorAll("#evidence button")].find((b) =>
        /Back to the first screenshot|Voltar à primeira captura/.test(b.textContent ?? ""),
      ),
    ),
  );

const showFindings = (page) =>
  page.evaluate(async () => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find(
      (b) => !/Screenshot|Captura/.test(b.textContent ?? ""),
    );
    tab?.click();
    await new Promise((r) => setTimeout(r, 300));
  });

const queueOf = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-group]")].map((g) => ({
      group: g.dataset.group,
      heading: (g.querySelector("h2")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      open: g.tagName === "DETAILS" ? g.open : true,
      rows: g.querySelectorAll("li[data-finding] h3 > button").length,
    })),
  );

const openFinding = (page, pattern) =>
  page.evaluate(async (source) => {
    const row = [...document.querySelectorAll("li[data-finding] h3 > button")].find((b) =>
      new RegExp(source, "i").test(b.textContent ?? ""),
    );
    row?.closest("details")?.setAttribute("open", "");
    if (row && row.getAttribute("aria-expanded") !== "true") row.click();
    await new Promise((r) => setTimeout(r, 500));
    const section = row?.closest("li")?.querySelector("section");
    if (!section) return null;
    const verdict = [...section.querySelectorAll("details")].find((d) =>
      /How this was verified/.test(d.querySelector("summary")?.textContent ?? ""),
    );
    const details = [...section.querySelectorAll("details")].find((d) =>
      /^Details$/.test(d.querySelector("summary")?.textContent.trim() ?? ""),
    );
    return {
      stations: [...section.querySelectorAll(":scope > ol > li > h4")].map((h) =>
        h.firstElementChild.textContent.trim(),
      ),
      end: section.dataset.chainEnd,
      testedInVerdict: Boolean(verdict),
      verdictOpen: verdict?.open ?? null,
      detailsOpen: details?.open ?? null,
      steps: section.querySelectorAll("ol.list-decimal li").length,
      guessNote: /not counted as a failure/.test(section.textContent ?? ""),
      showButton: [...section.querySelectorAll("button")].some((b) =>
        /Show on screenshot/.test(b.textContent ?? ""),
      ),
      focused: document.activeElement === row,
    };
  }, pattern);

const marksOn = (page) =>
  page.evaluate(() => {
    const figure = document.getElementById("capture-figure");
    return {
      findings: figure?.querySelectorAll('button[aria-label^="Finding "]').length ?? 0,
      stops: figure?.querySelectorAll('button[aria-label^="Focus stop"]').length ?? 0,
      current: Boolean(figure?.querySelector('[data-anchor="locus-current"]')),
    };
  });

const layer = (page, name) =>
  page.evaluate(async (label) => {
    const option = [...document.querySelectorAll("#evidence fieldset label")].find(
      (l) => l.textContent.trim() === label,
    );
    option?.click();
    await new Promise((r) => setTimeout(r, 300));
    return Boolean(option);
  }, name);

const layerControl = (page) =>
  page.evaluate(() => {
    const set = document.querySelector("#evidence fieldset");
    return {
      legend: set?.querySelector("legend")?.textContent.trim() ?? null,
      radios: set?.querySelectorAll('input[type="radio"]').length ?? 0,
      checked: set?.querySelector("input:checked")?.parentElement.textContent.trim() ?? null,
    };
  });

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
      const standing = document.getElementById("standing-heading");
      const firstRow = document.querySelector("li[data-finding] h3 > button");
      const caseFile = document.getElementById("case-file");
      const about = [...document.querySelectorAll("details")].find((d) =>
        /About this audit/.test(d.querySelector("summary")?.textContent ?? ""),
      );
      const text = document.body.innerText;
      return {
        h1: document.querySelectorAll("h1").length,
        standingIsH1: standing?.tagName === "H1",
        firstRow: firstRow ? Math.round(firstRow.getBoundingClientRect().top + scrollY) : null,
        work: /\d+ to fix|\d+ to check by hand/.test(caseFile?.textContent ?? ""),
        chips: /fails|No failures|not evaluated/i.test(caseFile?.textContent ?? ""),
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
        capture: Boolean(document.querySelector("#capture-figure img")),
      };
    });
    console.log("the top of the results:", JSON.stringify(top));
    check(top.h1 === 1 && top.standingIsH1, "the standing is not the page's one h1");
    check(
      top.firstRow !== null && top.firstRow < 700,
      `the first finding starts at ${top.firstRow}px`,
    );
    check(top.work, "the top does not say how much work is left");
    check(top.chips, "the WCAG chips left the top");
    check(top.capture, "the capture is not beside the case file");
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

  {
    const { page, context } = await open(1440);
    const queue = await queueOf(page);
    const review = await page.evaluate(async () => {
      const group = document.querySelector('details[data-group="check"]');
      if (group) group.open = true;
      await new Promise((r) => setTimeout(r, 200));
      const row = group?.querySelector("li[data-finding] h3 > button");
      row?.click();
      await new Promise((r) => setTimeout(r, 400));
      const section = row?.closest("li")?.querySelector("section");
      return {
        end: section?.dataset.chainEnd ?? null,
        howToCheck: /How to check/.test(section?.textContent ?? ""),
        steps: section?.querySelectorAll("ol.list-decimal li").length ?? 0,
        guessNote: /not counted as a failure/.test(section?.textContent ?? ""),
        change: [...(section?.querySelectorAll("h4") ?? [])].some(
          (h) => h.firstElementChild?.textContent.trim() === "Change",
        ),
      };
    });
    console.log("the work queue:", JSON.stringify({ queue, review }));
    check(
      queue.map((g) => g.group).join() === "fix,check,recommend",
      `the queue groups are ${queue.map((g) => g.group).join()}`,
    );
    check(queue[0]?.heading === "To fix 3", `the fix group reads ${queue[0]?.heading}`);
    check(queue[1]?.heading === "To check by hand 1", `the check group reads ${queue[1]?.heading}`);
    check(
      queue[2]?.heading === "Recommendations 1",
      `the recommendations read ${queue[2]?.heading}`,
    );
    check(queue[0]?.open && queue[0]?.rows === 3, "the fix group is not open with its three rows");
    check(!queue[1]?.open && !queue[2]?.open, "a secondary group starts open");
    check(review.end === "person", `a manual review ends with ${review.end}, not a person`);
    check(review.howToCheck && review.steps > 0, "a manual review lost its steps to check");
    check(!review.change, "a manual review is framed as something to change");
    check(!review.guessNote, "a manual review is explained as a guess");
    await context.close();
  }

  {
    const { page, context } = await open(420);
    await showFindings(page);
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
        "A corrigir 3 | Conferir à mão 1 | Recomendações 1",
      "the pt-BR queue headings are off",
    );
    await context.close();
  }

  {
    const { page, context } = await open(1440);
    const contrast = await openFinding(page, "contrast ratio");
    const onContrast = await marksOn(page);
    const altText = await openFinding(page, "alternative text");
    const onAlt = await marksOn(page);
    const connector = await page.evaluate(() => Boolean(document.querySelector("svg.fixed path")));
    console.log("an opened finding:", JSON.stringify({ contrast, onContrast, altText, onAlt }));
    check(
      contrast?.stations.join(" > ") === "Located > Measured > Change > Verified",
      `the contrast chain reads ${contrast?.stations.join(" > ")}`,
    );
    check(contrast?.end === "tested", `the contrast chain ends ${contrast?.end}`);
    check(contrast?.testedInVerdict, "how the fix was tested left the verdict");
    check(contrast?.verdictOpen === false, "how the fix was tested starts open");
    check(contrast?.detailsOpen === false, "the element details start open");
    check(altText?.stations[0] === "Located", `the alt text chain reads ${altText?.stations}`);
    check(onAlt.current, "opening a finding did not mark it on the capture");
    check(connector, "nothing ties the opened finding to its place on the capture");
    await context.close();
  }

  {
    const { page, context } = await open(420);
    await showFindings(page);
    const altText = await openFinding(page, "alternative text");
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
    check(altText?.stations[0] === "Located", `the phone chain reads ${altText?.stations}`);
    check(altText?.showButton, "the phone chain does not lead to the screenshot");
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

  await pickStop(page, 3);
  const first = {
    legend: await legend(page),
    caption: await caption(page),
    back: await backButton(page),
    marks: await marksOn(page),
  };
  console.log("stop in the first capture:", JSON.stringify(first));
  check(/1200/.test(first.legend), `the first capture lost its label: ${first.legend}`);
  check(!first.back, "the first capture offers a way back to itself");
  check(first.caption === "", `the first capture explains itself away: ${first.caption}`);
  check(first.marks.stops > 0, "picking a stop did not draw the focus path");

  await pickStop(page, 12);
  const contextual = {
    legend: await legend(page),
    caption: await caption(page),
    back: await backButton(page),
  };
  console.log("stop in a contextual capture:", JSON.stringify(contextual));
  check(
    /900px/.test(contextual.legend),
    `the contextual capture is unlabelled: ${contextual.legend}`,
  );
  check(contextual.back, "a contextual capture offers no way back");
  check(contextual.caption === "", `a placed stop was explained away: ${contextual.caption}`);

  await page.evaluate(() => {
    [...document.querySelectorAll("#evidence button")]
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
  const scroller = await caption(page);
  console.log("stop inside a scroller:", JSON.stringify(scroller));
  check(/scrolling area/i.test(scroller), `the scroller case says nothing: ${scroller}`);
  check(/at rest/i.test(scroller), "the scroller case does not say why the position is not drawn");
  check(!/#feed/.test(scroller) || !/ > /.test(scroller), "a css path leaked into the sentence");

  await pickStop(page, 41);
  const missed = {
    legend: await legend(page),
    back: await backButton(page),
    panel: await page.evaluate(() => document.getElementById("evidence")?.textContent ?? ""),
    image: await page.evaluate(() => Boolean(document.querySelector("#capture-figure img"))),
  };
  console.log("stop in a region the budget could not pay for:", JSON.stringify(missed));
  check(/3200px/.test(missed.legend), `the missed region kept another label: ${missed.legend}`);
  check(!missed.image, "a missed region still shows a screenshot underneath");
  check(/was not captured/i.test(missed.panel), "the missed region says nothing");
  check(/weight/i.test(missed.panel), "the missed region does not say why");
  check(missed.back, "a missed region offers no way back to the first capture");
  await context.close();

  const wide = await open(1560);
  const shot = await wide.page.evaluate(() =>
    Math.round(document.querySelector("#capture-figure img")?.getBoundingClientRect().width ?? 0),
  );
  console.log("capture at 1560px:", shot);
  check(shot / 1200 >= 0.7, `the screenshot renders at ${Math.round((shot / 1200) * 100)}%`);

  const control = await layerControl(wide.page);
  console.log("the choice of marks:", JSON.stringify(control));
  check(control.legend === "Marks", `the choice of marks is labelled ${control.legend}`);
  check(control.radios === 3, `the choice of marks offers ${control.radios} options`);
  check(control.checked === "Findings", `the capture opens on ${control.checked}`);

  await wide.page
    .waitForFunction(
      () => document.querySelectorAll('#capture-figure button[aria-label^="Finding "]').length > 0,
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  const shown = await marksOn(wide.page);
  await layer(wide.page, "None");
  const hidden = await marksOn(wide.page);
  await layer(wide.page, "Findings");
  const restored = await marksOn(wide.page);
  console.log("layers:", JSON.stringify({ shown, hidden, restored }));
  check(shown.findings > 0, "nothing is marked before the layers are touched");
  check(hidden.findings === 0 && hidden.stops === 0, "None left marks on the screenshot");
  check(restored.findings === shown.findings, "showing the findings again lost marks");

  await pickStop(wide.page, 3);
  const onStop = await marksOn(wide.page);
  await openFinding(wide.page, "alternative text");
  const onFinding = await marksOn(wide.page);
  console.log("stop then finding:", JSON.stringify({ onStop, onFinding }));
  check(onStop.stops > 0, "picking a stop did not draw the focus path");
  check(onFinding.current, "picking a finding after a stop did not bring its mark back");
  check(onFinding.stops === 0, "picking a finding left the focus path drawn over it");

  const keyboard = await wide.page.evaluate(async () => {
    const row = document.querySelector('li[data-finding] h3 > button[aria-expanded="false"]');
    row.focus();
    row.click();
    await new Promise((r) => setTimeout(r, 300));
    return document.activeElement === row && row.getAttribute("aria-expanded") === "true";
  });
  check(keyboard, "opening a finding moved keyboard focus off its row");
  await wide.context.close();

  const pt = await open(1440, "pt-BR");
  await pickStop(pt.page, 12);
  const ptLegend = await legend(pt.page);
  const ptBack = await backButton(pt.page);
  await pickStop(pt.page, 28);
  const ptScroller = await caption(pt.page);
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
