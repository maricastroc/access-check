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
  await page.waitForFunction(() => /Findings/i.test(document.body.textContent ?? ""), null, {
    timeout: 60_000,
  });
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
