/**
 * Latency benchmark for the scan pipeline.
 *
 * Runs the real `runScan` against one or more URLs and prints per-phase timing,
 * cold (first scan, pays the browser launch) vs warm (reuses the shared
 * browser). Uses the production options path (SSRF guard + resource blocking).
 *
 * Usage (run from the repo root so axe-core resolves):
 *   npx tsx scripts/bench.mjs
 *   npx tsx scripts/bench.mjs https://www.example.com https://www.nytimes.com
 *   npm run bench -- https://www.example.com
 *
 * Phase deltas map to: preparing→loading = browser acquire + context,
 * loading→auditing = goto + lazy-content priming + settle,
 * auditing→processing = screenshot ∥ axe, processing→finalizing = enrich +
 * verify + audits + keyboard + contexts.
 */
import { performance } from "node:perf_hooks";
import { runScan } from "../src/lib/scan/scan.ts";
import { closeSharedBrowser } from "../src/lib/scan/browser.ts";

const DEFAULT_URLS = ["https://www.example.com"];
const urls = process.argv.slice(2);
const targets = urls.length > 0 ? urls : DEFAULT_URLS;

async function measure(url, label) {
  const marks = [];
  let last = performance.now();
  const started = last;

  const result = await runScan(url, {
    blockPrivateHosts: true,
    onPhase: (phase) => {
      const now = performance.now();
      marks.push(`${phase}:${Math.round(now - last)}`);
      last = now;
    },
  });

  const total = Math.round(performance.now() - started);
  console.log(
    `  ${label.padEnd(6)} total=${String(total).padStart(5)}ms  ` +
      `score=${result.score} violations=${result.violations.length}  ` +
      `phases[${marks.join(" ")}]`,
  );
}

for (const url of targets) {
  console.log(`\n===== ${url} =====`);
  try {
    await measure(url, "cold");
    await measure(url, "warm");
    await measure(url, "warm2");
  } catch (err) {
    console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

await closeSharedBrowser();
