import type { Browser } from "playwright-core";

/**
 * Browser executor interface. The implementation changes depending on the
 * environment: local uses the full Playwright; serverless uses playwright-core +
 * @sparticuz/chromium. To swap in a container-based worker (Render etc.) just
 * create another executor and point getBrowserExecutor at it.
 */
export interface BrowserExecutor {
  launch(): Promise<Browser>;
}

/** Local: full Playwright (the Chromium that ships with the package, in devDeps). */
class LocalPlaywrightExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true }) as unknown as Promise<Browser>;
  }
}

/** Serverless (Vercel/Lambda): compressed Chromium + playwright-core. */
class ServerlessChromiumExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: playwright } = await import("playwright-core");
    // The Lambda's /dev/shm is tiny (~64MB), so Chromium's default use of it for
    // shared memory makes heavy pages fail navigation with
    // ERR_INSUFFICIENT_RESOURCES. Routing shared memory to /tmp and dropping the
    // GPU rasterizer keeps memory-hungry pages from exhausting the sandbox.
    const extraArgs = ["--disable-dev-shm-usage", "--disable-gpu"];
    const args = [
      ...chromium.args,
      ...extraArgs.filter((flag) => !chromium.args.includes(flag)),
    ];
    return playwright.launch({
      args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

const isServerless = Boolean(process.env.VERCEL || process.env.AC_SERVERLESS);

let executor: BrowserExecutor = isServerless
  ? new ServerlessChromiumExecutor()
  : new LocalPlaywrightExecutor();

export function setBrowserExecutor(next: BrowserExecutor) {
  executor = next;
}

export function getBrowserExecutor(): BrowserExecutor {
  return executor;
}

// Launching Chromium is expensive — cheap locally (~150ms) but seconds on a
// cold serverless invocation. We keep one browser alive and hand out an
// isolated BrowserContext per scan, so only the first scan on a warm instance
// pays the launch. Each scan still gets a fresh context (separate cookies,
// storage, cache), so reuse never leaks state between scans.
let shared: Browser | null = null;
let launching: Promise<Browser> | null = null;

export async function acquireBrowser(): Promise<Browser> {
  if (shared && shared.isConnected()) return shared;
  if (launching) return launching;

  launching = executor
    .launch()
    .then((browser) => {
      browser.on("disconnected", () => {
        if (shared === browser) shared = null;
      });
      shared = browser;
      launching = null;
      return browser;
    })
    .catch((err) => {
      launching = null;
      throw err;
    });

  return launching;
}

/** Closes the shared browser, if any. Mainly for test teardown. */
export async function closeSharedBrowser(): Promise<void> {
  const browser = shared;
  shared = null;
  launching = null;
  if (browser) await browser.close().catch(() => {});
}
