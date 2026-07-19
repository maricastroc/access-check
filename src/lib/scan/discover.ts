import { assertPublicUrl } from "./ssrf";

export const MAX_PAGES = 10;

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AccessCheckBot/2.1";

const NON_HTML =
  /\.(pdf|jpe?g|png|gif|svg|webp|avif|ico|css|js|mjs|json|xml|zip|gz|rar|mp4|webm|mov|mp3|wav|woff2?|ttf|otf|eot|txt|csv|rss|atom)$/i;

export function normalizeRoot(input: string): string {
  const t = input.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'");
}

/** Extracts the <loc> values from a sitemap (or sitemap index). */
export function parseLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = decodeEntities(m[1].trim());
    if (v) out.push(v);
  }
  return out;
}

/** Extracts the href of <a> tags from HTML, resolving relative ones against baseUrl. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!raw || /^(mailto:|tel:|javascript:|data:|#)/i.test(raw)) continue;
    try {
      out.push(new URL(decodeEntities(raw), baseUrl).toString());
    } catch {
      //
    }
  }
  return out;
}

export function canonicalize(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Filters to same-origin HTML pages, canonicalized and deduplicated. */
export function sameOriginPages(urls: string[], origin: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const c = canonicalize(u);
    if (!c) continue;
    let parsed: URL;
    try {
      parsed = new URL(c);
    } catch {
      continue;
    }
    if (parsed.origin !== origin) continue;
    if (NON_HTML.test(parsed.pathname)) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/** The root always comes first; then the discovered ones, without repeats, up to `cap`. */
export function selectCrawlUrls(root: string, discovered: string[], cap = MAX_PAGES): string[] {
  const rootC = canonicalize(root) ?? root;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [rootC, ...discovered]) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= cap) break;
  }
  return out;
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      try {
        await assertPublicUrl(current);
      } catch {
        return null;
      }
      const res = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }
      if (!res.ok) return null;
      return await res.text();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fromSitemap(origin: string, cap: number): Promise<string[]> {
  for (const sm of [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]) {
    const xml = await fetchText(sm, 6000);
    if (!xml) continue;

    const locs = parseLocs(xml);
    const isNested = (l: string) => {
      try {
        return /\.xml(\.gz)?$/i.test(new URL(l, origin).pathname);
      } catch {
        return false;
      }
    };
    const nested = locs.filter(isNested);
    const pages = locs.filter((l) => !isNested(l));

    for (const child of nested.slice(0, 3)) {
      if (pages.length >= cap * 4) break;
      const cxml = await fetchText(child, 6000);
      if (cxml) pages.push(...parseLocs(cxml));
    }

    if (pages.length > 0) return pages;
  }
  return [];
}

/**
 * Discovers up to `cap` HTML pages from the same site, starting from the root.
 * Always returns at least [root] — even if the network/discovery fails.
 */
export async function discoverUrls(rootInput: string, cap = MAX_PAGES): Promise<string[]> {
  const root = normalizeRoot(rootInput);
  let origin: string;
  try {
    origin = new URL(root).origin;
  } catch {
    return [root];
  }

  let discovered = sameOriginPages(await fromSitemap(origin, cap), origin);

  if (discovered.length < 2) {
    const html = await fetchText(root);
    if (html) {
      discovered = sameOriginPages([...discovered, ...extractLinks(html, root)], origin);
    }
  }

  return selectCrawlUrls(root, discovered, cap);
}
