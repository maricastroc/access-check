import { describe, expect, it } from "vitest";
import {
  canonicalize,
  extractLinks,
  normalizeRoot,
  parseLocs,
  sameOriginPages,
  selectCrawlUrls,
} from "./discover";

describe("normalizeRoot", () => {
  it("prepends https when the scheme is missing", () => {
    expect(normalizeRoot("example.com")).toBe("https://example.com");
    expect(normalizeRoot("  example.com  ")).toBe("https://example.com");
  });

  it("preserves an existing scheme", () => {
    expect(normalizeRoot("http://example.com")).toBe("http://example.com");
    expect(normalizeRoot("https://example.com/x")).toBe("https://example.com/x");
  });
});

describe("parseLocs", () => {
  it("extracts the <loc> entries from a sitemap", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://a.com/</loc></url>
      <url><loc>https://a.com/about</loc></url>
    </urlset>`;
    expect(parseLocs(xml)).toEqual(["https://a.com/", "https://a.com/about"]);
  });

  it("decodes entities and ignores empty ones", () => {
    const xml = `<url><loc>https://a.com/?x=1&amp;y=2</loc></url><url><loc></loc></url>`;
    expect(parseLocs(xml)).toEqual(["https://a.com/?x=1&y=2"]);
  });
});

describe("extractLinks", () => {
  it("resolves relative URLs against the base and ignores anchors/mailto", () => {
    const html = `
      <a href="/about">a</a>
      <a href='contact'>c</a>
      <a href="#top">skip</a>
      <a href="mailto:x@y.com">mail</a>
      <a href="https://other.com/x">ext</a>`;
    expect(extractLinks(html, "https://a.com/")).toEqual([
      "https://a.com/about",
      "https://a.com/contact",
      "https://other.com/x",
    ]);
  });
});

describe("canonicalize", () => {
  it("removes hash, query and trailing slash", () => {
    expect(canonicalize("https://a.com/x/?q=1#top")).toBe("https://a.com/x");
  });

  it("keeps the root slash", () => {
    expect(canonicalize("https://a.com/")).toBe("https://a.com/");
  });

  it("rejects non-http schemes", () => {
    expect(canonicalize("ftp://a.com/x")).toBeNull();
    expect(canonicalize("not a url")).toBeNull();
  });
});

describe("sameOriginPages", () => {
  it("filters by origin, removes non-HTML and deduplicates", () => {
    const urls = [
      "https://a.com/",
      "https://a.com/about",
      "https://a.com/about/",
      "https://a.com/logo.png",
      "https://other.com/x",
    ];
    expect(sameOriginPages(urls, "https://a.com")).toEqual([
      "https://a.com/",
      "https://a.com/about",
    ]);
  });
});

describe("selectCrawlUrls", () => {
  it("puts the root first, without duplicating, and respects the cap", () => {
    const out = selectCrawlUrls(
      "https://a.com/",
      ["https://a.com/b", "https://a.com/", "https://a.com/c", "https://a.com/d"],
      3,
    );
    expect(out).toEqual(["https://a.com/", "https://a.com/b", "https://a.com/c"]);
  });
});
