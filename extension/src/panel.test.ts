import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { crossOriginWarning } from "./coverage";
import { unsupportedReason } from "./state";

const file = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const panel = file("./panel.tsx");
const audit = file("./audit.ts");
const manifest = JSON.parse(file("../manifest.json")) as {
  permissions: string[];
  host_permissions?: string[];
};

describe("the panel reuses the product's own report", () => {
  it("renders the shared findings list, not a second one", () => {
    expect(panel).toContain('from "../../src/lib/report/findings"');
    expect(panel).toContain("buildFindings(result)");
  });

  it("uses the shared components rather than copies", () => {
    expect(panel).toContain('from "../../src/components/ui/finding-row"');
    expect(panel).toContain('from "../../src/components/ui/warning-list"');
    expect(panel).toContain('from "../../src/components/ui/section-kicker"');
  });

  it("has no second implementation of the counts or the summary", () => {
    expect(panel).toContain("result.summary");
    expect(panel).not.toMatch(/violations\.filter\(/);
    expect(panel).not.toContain("computeScore");
    expect(panel).not.toContain("buildSummary");
  });

  it("never puts page content into innerHTML", () => {
    for (const source of [panel, audit]) {
      expect(source).not.toContain("innerHTML");
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("always names a partial reading next to the score", () => {
    expect(panel).toContain("Partial audit score");
    expect(panel).toContain("not comparable with a full");
  });

  it("offers a recoverable path when the content script fails", () => {
    expect(panel).toContain('state.kind === "error"');
    expect(panel).toContain("state.recoverable");
  });
});

describe("permissions stay minimal", () => {
  it("asks for nothing beyond the click, the injection and the panel", () => {
    expect(manifest.permissions.sort()).toEqual(["activeTab", "scripting", "sidePanel"]);
  });

  it("asks for no host access at all", () => {
    expect(manifest.host_permissions).toBeUndefined();
  });
});

describe("pages the audit cannot read", () => {
  it("names a reason for each one", () => {
    expect(unsupportedReason("chrome://settings")).toMatch(/own pages/);
    expect(unsupportedReason("chrome-extension://abc/panel.html")).toMatch(/extension page/);
    expect(unsupportedReason("https://chromewebstore.google.com/detail/x")).toMatch(/Web Store/);
    expect(unsupportedReason("file:///Users/me/page.html")).toMatch(/file access/);
    expect(unsupportedReason("https://example.com/report.pdf")).toMatch(/viewer/);
    expect(unsupportedReason(undefined)).toMatch(/no address/);
  });

  it("lets an ordinary page through", () => {
    expect(unsupportedReason("https://www.wikipedia.org/")).toBeNull();
    expect(unsupportedReason("http://localhost:3002/results")).toBeNull();
  });
});

describe("assets the audit is not allowed to fetch", () => {
  it("says what was unreadable, in counts, never in URLs", () => {
    const one = crossOriginWarning({ styleSheets: 1, media: 0 });

    expect(one.code).toBe("cross-origin-assets");
    expect(one.message).toContain("1 stylesheet on this page comes from another origin");
    expect(one.message).toContain("orientation-lock");
    expect(one.message).not.toMatch(/https?:\/\//);
    expect(one.message).not.toContain("ProgressEvent");
  });

  it("counts stylesheets and media together", () => {
    const both = crossOriginWarning({ styleSheets: 3, media: 2 });

    expect(both.message).toContain("3 stylesheets and 2 media files on this page come from");
  });

  it("keeps the rest of the reading intact in its wording", () => {
    expect(crossOriginWarning({ styleSheets: 1, media: 0 }).message).toContain(
      "Everything read from the page itself is unaffected",
    );
  });

  it("asks axe to preload only when every asset is readable", () => {
    expect(audit).toContain("const preload = assets.styleSheets === 0 && assets.media === 0");
    expect(audit).toContain("dom.runAxe(dom.AXE_TAGS, { preload })");
  });

  it("adds the warning only when it turned the preload off", () => {
    expect(audit).toContain(
      "warnings: preload ? UNAVAILABLE : [...UNAVAILABLE, crossOriginWarning(assets)]",
    );
  });
});
