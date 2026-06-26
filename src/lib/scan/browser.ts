import type { Browser } from "playwright-core";

/**
 * Interface do executor de browser. A implementação muda conforme o ambiente:
 * local usa o Playwright completo; serverless usa playwright-core +
 * @sparticuz/chromium. Pra trocar por um worker em container (Render etc.)
 * basta criar outro executor e apontar o getBrowserExecutor pra ele.
 */
export interface BrowserExecutor {
  launch(): Promise<Browser>;
}

/** Local: Playwright completo (Chromium que vem com o pacote, em devDeps). */
class LocalPlaywrightExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true }) as unknown as Promise<Browser>;
  }
}

/** Serverless (Vercel/Lambda): Chromium comprimido + playwright-core. */
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
