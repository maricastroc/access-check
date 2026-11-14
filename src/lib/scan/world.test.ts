import { afterAll, describe, expect, it } from "vitest";
import { acquireBrowser, closeSharedBrowser } from "./browser";
import { openIsolatedWorld } from "./world";

afterAll(async () => {
  await closeSharedBrowser();
});

describe("openIsolatedWorld", () => {
  it("rejects a call in flight when the page crashes", async () => {
    const browser = await acquireBrowser();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent("<p>ready</p>");
      const world = await openIsolatedWorld(page);

      const pending = world.evaluate(() => new Promise(() => undefined));
      void page.goto("chrome://crash").catch(() => undefined);

      await expect(pending).rejects.toThrow(/has been closed/);
    } finally {
      await context.close().catch(() => undefined);
    }
  }, 15_000);

  it("rejects a call in flight when the browser disconnects", async () => {
    const browser = await acquireBrowser();
    const page = await (await browser.newContext()).newPage();
    await page.setContent("<p>ready</p>");
    const world = await openIsolatedWorld(page);

    const outcome = expect(world.evaluate(() => new Promise(() => undefined))).rejects.toThrow(
      /has been closed/,
    );
    await closeSharedBrowser();

    await outcome;
  }, 15_000);
});
