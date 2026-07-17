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
  it("prepende https quando falta o esquema", () => {
    expect(normalizeRoot("example.com")).toBe("https://example.com");
    expect(normalizeRoot("  example.com  ")).toBe("https://example.com");
  });

  it("preserva um esquema existente", () => {
    expect(normalizeRoot("http://example.com")).toBe("http://example.com");
    expect(normalizeRoot("https://example.com/x")).toBe("https://example.com/x");
  });
});

describe("parseLocs", () => {
  it("extrai as <loc> de um sitemap", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://a.com/</loc></url>
      <url><loc>https://a.com/about</loc></url>
    </urlset>`;
    expect(parseLocs(xml)).toEqual(["https://a.com/", "https://a.com/about"]);
  });

  it("decodifica entidades e ignora vazios", () => {
    const xml = `<url><loc>https://a.com/?x=1&amp;y=2</loc></url><url><loc></loc></url>`;
    expect(parseLocs(xml)).toEqual(["https://a.com/?x=1&y=2"]);
  });
});

describe("extractLinks", () => {
  it("resolve relativos contra a base e ignora âncoras/mailto", () => {
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
  it("remove hash, query e barra final", () => {
    expect(canonicalize("https://a.com/x/?q=1#top")).toBe("https://a.com/x");
  });

  it("mantém a barra da raiz", () => {
    expect(canonicalize("https://a.com/")).toBe("https://a.com/");
  });

  it("rejeita esquemas não-http", () => {
    expect(canonicalize("ftp://a.com/x")).toBeNull();
    expect(canonicalize("not a url")).toBeNull();
  });
});

describe("sameOriginPages", () => {
  it("filtra por origin, remove não-HTML e deduplica", () => {
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
  it("coloca a raiz primeiro, sem duplicar, e respeita o cap", () => {
    const out = selectCrawlUrls(
      "https://a.com/",
      ["https://a.com/b", "https://a.com/", "https://a.com/c", "https://a.com/d"],
      3,
    );
    expect(out).toEqual(["https://a.com/", "https://a.com/b", "https://a.com/c"]);
  });
});
