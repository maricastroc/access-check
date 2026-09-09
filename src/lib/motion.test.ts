import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, scrollBehavior } from "./motion";

function withMediaQuery(matches: boolean) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: query.includes("reduce") && matches }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("motion preference", () => {
  it("scrolls smoothly for readers who did not ask for less motion", () => {
    withMediaQuery(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe("smooth");
  });

  it("drops the animation for readers who did", () => {
    withMediaQuery(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe("auto");
  });

  it("defers to the stylesheet when the preference cannot be read", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe("auto");
  });

  it("defers to the stylesheet in a browser without matchMedia", () => {
    vi.stubGlobal("window", {});
    expect(scrollBehavior()).toBe("auto");
  });
});
