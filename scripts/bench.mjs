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
