import type { Browser } from "playwright-core";

export interface BrowserExecutor {
  launch(): Promise<Browser>;
}

class LocalPlaywrightExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true }) as unknown as Promise<Browser>;
  }
}

class ServerlessChromiumExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: playwright } = await import("playwright-core");
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

export async function closeSharedBrowser(): Promise<void> {
  const browser = shared;
  shared = null;
  launching = null;
  if (browser) await browser.close().catch(() => {});
}
