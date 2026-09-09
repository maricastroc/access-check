import { afterEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "axe-core";
import { AXE_TAGS, runAxeInPage } from "./axe";

const PT_BR = { lang: "pt_BR" } as unknown as Locale;

function stubAxe(configure: () => void) {
  const run = vi.fn().mockResolvedValue({ violations: [], passes: [], incomplete: [] });
  vi.stubGlobal("window", { axe: { configure: vi.fn(configure), run } });
  vi.stubGlobal("document", {});
  return run;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("running axe in the page", () => {
  it("asks for the reader's language when there is one to ask for", async () => {
    const run = stubAxe(() => {});

    await runAxeInPage(AXE_TAGS, { locale: PT_BR });

    expect(window.axe.configure).toHaveBeenCalledWith({ locale: PT_BR });
    expect(run).toHaveBeenCalledOnce();
  });

  it("leaves axe alone when the reading is in axe's own language", async () => {
    stubAxe(() => {});

    await runAxeInPage(AXE_TAGS, { locale: null });

    expect(window.axe.configure).not.toHaveBeenCalled();
  });

  it("still audits a page whose policy forbids the eval that localizing needs", async () => {
    const run = stubAxe(() => {
      throw new Error("Evaluating a string as JavaScript violates the Content Security Policy");
    });

    await expect(runAxeInPage(AXE_TAGS, { locale: PT_BR })).resolves.toBeDefined();
    expect(run).toHaveBeenCalledOnce();
  });
});
