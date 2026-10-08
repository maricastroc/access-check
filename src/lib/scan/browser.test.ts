import { EventEmitter } from "events";
import type { Browser } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acquireBrowser,
  browserHealth,
  closeSharedBrowser,
  getBrowserExecutor,
  leaseBrowser,
  setBrowserExecutor,
  type BrowserExecutor,
} from "./browser";

type FakeBrowser = Browser & { id: number; closed: boolean; crash(): void };

function fakeBrowser(id: number): FakeBrowser {
  const events = new EventEmitter();
  const fake = {
    id,
    closed: false,
    isConnected: () => !fake.closed,
    on: (event: string, listener: () => void) => events.on(event, listener),
    close: async () => {
      if (fake.closed) return;
      fake.closed = true;
      events.emit("disconnected");
    },
    crash: () => {
      fake.closed = true;
      events.emit("disconnected");
    },
  };
  return fake as unknown as FakeBrowser;
}

function fakeExecutor() {
  const launched: FakeBrowser[] = [];
  const disposed: FakeBrowser[] = [];
  let release: (() => void) | null = null;
  const executor: BrowserExecutor & { hold(): void } = {
    hold() {
      release = null;
      executor.launch = () =>
        new Promise<Browser>((resolve) => {
          release = () => {
            const browser = fakeBrowser(launched.length + 1);
            launched.push(browser);
            resolve(browser);
          };
        });
    },
    async launch() {
      const browser = fakeBrowser(launched.length + 1);
      launched.push(browser);
      return browser;
    },
    async dispose(browser) {
      disposed.push(browser as FakeBrowser);
      await browser.close();
    },
    async strays() {
      return 0;
    },
  };
  return { executor, launched, disposed, finishLaunch: () => release?.() };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let real: BrowserExecutor;

beforeEach(async () => {
  real = getBrowserExecutor();
  await closeSharedBrowser();
});

afterEach(async () => {
  await closeSharedBrowser();
  setBrowserExecutor(real);
});

describe("shared browser leases", () => {
  it("keeps sharing a browser that finished its scans cleanly", async () => {
    const { executor, launched } = fakeExecutor();
    setBrowserExecutor(executor);

    const first = await leaseBrowser();
    first.release();
    const second = await leaseBrowser();
    second.release();

    expect(launched).toHaveLength(1);
    expect(second.browser).toBe(first.browser);
    expect(launched[0].closed).toBe(false);
  });

  it("closes a retired browser and hands the next scan a fresh one", async () => {
    const { executor, launched, disposed } = fakeExecutor();
    setBrowserExecutor(executor);

    const stuck = await leaseBrowser();
    stuck.release(true);
    await tick();

    const next = await leaseBrowser();

    expect(disposed).toEqual([launched[0]]);
    expect(launched[0].closed).toBe(true);
    expect(next.browser).toBe(launched[1]);
    next.release();
  });

  it("waits for the other scans on a retired browser before closing it", async () => {
    const { executor, launched } = fakeExecutor();
    setBrowserExecutor(executor);

    const a = await leaseBrowser();
    const b = await leaseBrowser();
    expect(b.browser).toBe(a.browser);

    a.release(true);
    await tick();
    expect(launched[0].closed).toBe(false);

    const c = await leaseBrowser();
    expect(c.browser).toBe(launched[1]);

    b.release();
    await tick();
    expect(launched[0].closed).toBe(true);
    c.release();
  });

  it("releasing twice does not close a browser another scan still holds", async () => {
    const { executor, launched } = fakeExecutor();
    setBrowserExecutor(executor);

    const a = await leaseBrowser();
    const b = await leaseBrowser();
    a.release(true);
    a.release(true);
    await tick();

    expect(launched[0].closed).toBe(false);
    b.release();
    await tick();
    expect(launched[0].closed).toBe(true);
  });

  it("disposes a browser that disconnects on its own and launches a new one", async () => {
    const { executor, launched, disposed } = fakeExecutor();
    setBrowserExecutor(executor);

    const first = await acquireBrowser();
    (first as FakeBrowser).crash();
    await tick();
    const second = await acquireBrowser();

    expect(disposed).toContain(first);
    expect(second).toBe(launched[1]);
  });

  it("never adopts a browser that finished starting after it was closed", async () => {
    const { executor, launched, disposed, finishLaunch } = fakeExecutor();
    executor.hold();
    setBrowserExecutor(executor);

    const pending = acquireBrowser().catch((err: unknown) => err);
    await tick();
    const closing = closeSharedBrowser();
    finishLaunch();
    await closing;

    expect(await pending).toBeInstanceOf(Error);
    expect(String(await pending)).toMatch(/has been closed/);
    expect(disposed).toEqual([launched[0]]);
    expect(launched[0].closed).toBe(true);
  });
});

describe("browserHealth", () => {
  it("reports free memory, free temp space and leftover browsers", async () => {
    const { executor } = fakeExecutor();
    setBrowserExecutor(executor);

    const health = await browserHealth();

    expect(health.memFreeMb).toBeGreaterThan(0);
    expect(health.tmpFreeMb).toBeGreaterThan(0);
    expect(health.strayBrowsers).toBe(0);
  });
});
