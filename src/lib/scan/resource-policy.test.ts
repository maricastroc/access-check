import { describe, expect, it } from "vitest";
import { shouldBlockResource } from "./resource-policy";

describe("shouldBlockResource", () => {
  it("keeps everything the audit depends on", () => {
    for (const type of ["document", "stylesheet", "image", "script", "xhr", "fetch"]) {
      expect(shouldBlockResource(type, "https://example.com/a")).toBe(false);
    }
  });

  it("blocks fonts and media", () => {
    expect(shouldBlockResource("font", "https://example.com/a.woff2")).toBe(true);
    expect(shouldBlockResource("media", "https://example.com/v.mp4")).toBe(true);
  });

  it("blocks known trackers regardless of resource type", () => {
    expect(shouldBlockResource("script", "https://www.google-analytics.com/analytics.js")).toBe(
      true,
    );
    expect(
      shouldBlockResource("script", "https://connect.facebook.net/en_US/fbevents.js"),
    ).toBe(true);
    expect(shouldBlockResource("image", "https://sb.scorecardresearch.com/p?c1=2")).toBe(true);
  });

  it("matches trackers on subdomains but not on lookalike first-party hosts", () => {
    expect(shouldBlockResource("script", "https://region1.google-analytics.com/g")).toBe(true);
    // A first-party asset that merely mentions a brand name in the path is kept.
    expect(shouldBlockResource("script", "https://example.com/segment/app.js")).toBe(false);
  });

  it("does not block first-party images or CSS on a normal site", () => {
    expect(shouldBlockResource("image", "https://cdn.example.com/logo.png")).toBe(false);
    expect(shouldBlockResource("stylesheet", "https://example.com/site.css")).toBe(false);
  });

  it("keeps requests with an unparseable URL (fails open, lets SSRF guard decide)", () => {
    expect(shouldBlockResource("script", "not a url")).toBe(false);
  });
});
