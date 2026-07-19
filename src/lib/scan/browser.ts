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
    return playwright.launch({
      args: chromium.args,
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
