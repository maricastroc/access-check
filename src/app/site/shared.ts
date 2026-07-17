import type { PageStatus, SiteStatus } from "@/lib/scan/site-aggregate";

export type { PageStatus, SiteStatus };

export type CrawlPage = {
  id: string;
  url: string;
  status: PageStatus;
  title: string | null;
  score: number | null;
  counts: { critical: number; serious: number; moderate: number; minor: number };
  error: string | null;
};

export type CrawlSnapshot = {
  id: string;
  rootUrl: string;
  status: SiteStatus;
  totalPages: number;
  scannedPages: number;
  failedPages: number;
  score: number | null;
  error: string | null;
  createdAt: string;
  pages: CrawlPage[];
};

export function pagePath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/" : u.pathname;
  } catch {
    return url;
  }
}

export function crawlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
