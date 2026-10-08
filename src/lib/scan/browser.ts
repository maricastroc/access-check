import { statfs } from "fs/promises";
import os from "os";
import type { Browser } from "playwright-core";
import { childProcesses, killProcessGroups } from "./processes";

export interface BrowserExecutor {
  launch(): Promise<Browser>;
  dispose?(browser: Browser): Promise<void>;
  strays?(): Promise<number>;
}

export const CLOSE_GRACE_MS = 3_000;

const MB = 1024 * 1024;

const noop = (): void => undefined;

export async function settlesWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.then(
        () => true,
        () => true,
      ),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class LocalPlaywrightExecutor implements BrowserExecutor {
  async launch(): Promise<Browser> {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true }) as unknown as Promise<Browser>;
  }
}

class ServerlessChromiumExecutor implements BrowserExecutor {
  private readonly owned = new Map<Browser, number[]>();
  private queue: Promise<unknown> = Promise.resolve();
  private executable: string | null = null;

  launch(): Promise<Browser> {
    const next = this.queue.then(() => this.launchNow());
    this.queue = next.catch(noop);
    return next;
  }

  async dispose(browser: Browser): Promise<void> {
    const pids = this.owned.get(browser) ?? [];
    this.owned.delete(browser);
    if (!(await settlesWithin(browser.close(), CLOSE_GRACE_MS))) killProcessGroups(pids);
  }

  async strays(): Promise<number> {
    return this.executable ? (await this.unowned(this.executable)).length : 0;
  }

  private async launchNow(): Promise<Browser> {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: playwright } = await import("playwright-core");
    chromium.setGraphicsMode = false;
    const extraArgs = ["--disable-dev-shm-usage", "--disable-gpu"];
    const args = [...chromium.args, ...extraArgs.filter((flag) => !chromium.args.includes(flag))];
    const executablePath = await chromium.executablePath();
    this.executable = executablePath;

    for (const [browser] of this.owned) {
      if (!browser.isConnected()) this.owned.delete(browser);
    }
    killProcessGroups(await this.unowned(executablePath));

    const before = new Set(await this.children(executablePath));
    const browser = await playwright.launch({ args, executablePath, headless: true });
    const after = await this.children(executablePath);
    this.owned.set(
      browser,
      after.filter((pid) => !before.has(pid)),
    );
    return browser;
  }

  private children(executable: string): Promise<number[]> {
    return childProcesses({ parentPid: process.pid, executable });
  }

  private async unowned(executable: string): Promise<number[]> {
    const live = new Set(
      [...this.owned].filter(([browser]) => browser.isConnected()).flatMap(([, pids]) => pids),
    );
    return (await this.children(executable)).filter((pid) => !live.has(pid));
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
let generation = 0;
const leases = new Map<Browser, number>();
const retired = new Set<Browser>();
const disposed = new WeakSet<Browser>();
const disposing = new Set<Promise<void>>();

function dispose(browser: Browser, by: BrowserExecutor = executor): Promise<void> {
  if (shared === browser) shared = null;
  retired.delete(browser);
  leases.delete(browser);
  if (disposed.has(browser)) return Promise.resolve();
  disposed.add(browser);

  const done = (
    by.dispose ? by.dispose(browser) : settlesWithin(browser.close(), CLOSE_GRACE_MS)
  ).then(noop, noop);
  disposing.add(done);
  void done.finally(() => disposing.delete(done));
  return done;
}

export async function acquireBrowser(): Promise<Browser> {
  if (shared && shared.isConnected()) return shared;
  if (launching) return launching;

  const startedIn = generation;
  const launcher = executor;
  const attempt = (async () => {
    await Promise.all(disposing);
    const browser = await launcher.launch();
    if (startedIn !== generation) {
      void dispose(browser, launcher);
      throw new Error("Browser has been closed while it was starting");
    }
    browser.on("disconnected", () => void dispose(browser, launcher));
    shared = browser;
    return browser;
  })();

  launching = attempt;
  void attempt.then(
    () => (launching === attempt ? (launching = null) : null),
    () => (launching === attempt ? (launching = null) : null),
  );
  return attempt;
}

export type BrowserLease = {
  browser: Browser;
  release(retire?: boolean): void;
};

export async function leaseBrowser(): Promise<BrowserLease> {
  const browser = await acquireBrowser();
  leases.set(browser, (leases.get(browser) ?? 0) + 1);
  let released = false;

  return {
    browser,
    release(retire = false) {
      if (released) return;
      released = true;
      const left = (leases.get(browser) ?? 1) - 1;
      if (left > 0) leases.set(browser, left);
      else leases.delete(browser);

      if (retire) {
        retired.add(browser);
        if (shared === browser) shared = null;
      }
      if (left <= 0 && retired.has(browser)) void dispose(browser);
    },
  };
}

export async function closeSharedBrowser(): Promise<void> {
  generation += 1;
  const browser = shared;
  shared = null;
  launching = null;
  if (browser) await dispose(browser);
  await Promise.all(disposing);
}

export async function browserHealth(): Promise<Record<string, number>> {
  const health: Record<string, number> = { memFreeMb: Math.round(os.freemem() / MB) };
  const tmp = await statfs(os.tmpdir()).catch(() => null);
  if (tmp) health.tmpFreeMb = Math.round((tmp.bavail * tmp.bsize) / MB);
  const strays = await executor.strays?.().catch(() => undefined);
  if (strays !== undefined) health.strayBrowsers = strays;
  return health;
}
