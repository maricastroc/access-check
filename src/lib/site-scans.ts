import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ScanResult } from "@/lib/scan/types";
import type { ScanOptions } from "@/lib/scan/scan";
import type { PageStatus, SiteStatus } from "@/lib/scan/site-aggregate";

export type { PageStatus, SiteStatus } from "@/lib/scan/site-aggregate";
export { aggregateScore, type PageScore } from "@/lib/scan/site-aggregate";

export const CRAWL_SCAN_OPTS: ScanOptions = {
  screenshot: false,
  keyboard: false,
  contexts: false,
  verifyFixes: false,
};

export async function createSiteScan(
  rootUrl: string,
  urls: string[],
  userId: string | null,
): Promise<string> {
  const site = await prisma.siteScan.create({
    data: {
      userId: userId ?? null,
      rootUrl,
      status: "running",
      totalPages: urls.length,
      pages: { create: urls.map((url) => ({ url })) },
    },
    select: { id: true },
  });
  return site.id;
}

/** Marks the entire crawl as failed (e.g. the pages couldn't be enqueued). */
export async function failSiteScan(id: string, error: string): Promise<void> {
  await prisma.siteScan.update({
    where: { id },
    data: { status: "failed", error },
  });
}

/** Marks the page as "running" (only if it's still pending). */
export async function markPageRunning(siteScanId: string, url: string): Promise<void> {
  await prisma.siteScanPage.updateMany({
    where: { siteScanId, url, status: "pending" },
    data: { status: "running" },
  });
}

type PageOutcome = { ok: true; result: ScanResult } | { ok: false; error: string };

/** Records a page's result (or error) and recomputes the site's progress. */
export async function completePage(
  siteScanId: string,
  url: string,
  outcome: PageOutcome,
): Promise<void> {
  await prisma.siteScanPage.updateMany({
    where: { siteScanId, url },
    data: outcome.ok
      ? {
          status: "done",
          title: outcome.result.title,
          score: outcome.result.score,
          critical: outcome.result.counts.critical,
          serious: outcome.result.counts.serious,
          moderate: outcome.result.counts.moderate,
          minor: outcome.result.counts.minor,
          result: outcome.result as unknown as Prisma.InputJsonValue,
          error: null,
        }
      : { status: "failed", error: outcome.error },
  });

  await recomputeSiteProgress(siteScanId);
}

/**
 * Recomputes the site's counts + completion in a single atomic UPDATE. The subquery
 * reads the pages' current state at execution time, so workers that finish in
 * parallel converge on the correct final state without a race: any recompute that
 * runs after the last page sees everything settled marks it "completed".
 */
async function recomputeSiteProgress(siteScanId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "site_scans" s SET
      "scannedPages" = sub.done,
      "failedPages" = sub.failed,
      "status" = CASE WHEN sub.settled >= s."totalPages"
                      THEN (CASE WHEN sub.done > 0 THEN 'completed' ELSE 'failed' END)
                      ELSE s."status" END,
      "score" = CASE WHEN sub.settled >= s."totalPages" THEN sub.avg_score ELSE s."score" END,
      "updatedAt" = now()
    FROM (
      SELECT
        count(*) FILTER (WHERE "status" = 'done')::int AS done,
        count(*) FILTER (WHERE "status" = 'failed')::int AS failed,
        count(*) FILTER (WHERE "status" IN ('done','failed'))::int AS settled,
        round(avg("score") FILTER (WHERE "status" = 'done' AND "score" IS NOT NULL))::int AS avg_score
      FROM "site_scan_pages" WHERE "siteScanId" = ${siteScanId}
    ) sub
    WHERE s."id" = ${siteScanId}
  `;
}

export type SiteScanPageView = {
  id: string;
  url: string;
  status: PageStatus;
  title: string | null;
  score: number | null;
  counts: { critical: number; serious: number; moderate: number; minor: number };
  error: string | null;
};

export type SiteScanSnapshot = {
  id: string;
  rootUrl: string;
  status: SiteStatus;
  totalPages: number;
  scannedPages: number;
  failedPages: number;
  score: number | null;
  error: string | null;
  createdAt: Date;
  pages: SiteScanPageView[];
};

/** Complete snapshot of a crawl (progress + pages), by id. */
export async function getSiteScan(id: string): Promise<SiteScanSnapshot | null> {
  const s = await prisma.siteScan.findUnique({
    where: { id },
    select: {
      id: true,
      rootUrl: true,
      status: true,
      totalPages: true,
      scannedPages: true,
      failedPages: true,
      score: true,
      error: true,
      createdAt: true,
      pages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          status: true,
          title: true,
          score: true,
          critical: true,
          serious: true,
          moderate: true,
          minor: true,
          error: true,
        },
      },
    },
  });
  if (!s) return null;

  return {
    id: s.id,
    rootUrl: s.rootUrl,
    status: s.status as SiteStatus,
    totalPages: s.totalPages,
    scannedPages: s.scannedPages,
    failedPages: s.failedPages,
    score: s.score,
    error: s.error,
    createdAt: s.createdAt,
    pages: s.pages.map((p) => ({
      id: p.id,
      url: p.url,
      status: p.status as PageStatus,
      title: p.title,
      score: p.score,
      counts: {
        critical: p.critical,
        serious: p.serious,
        moderate: p.moderate,
        minor: p.minor,
      },
      error: p.error,
    })),
  };
}

/**
 * ScanResult (lightweight profile) already collected for a crawl page. Lets the
 * results screen open instantly, without re-scanning. Returns null if the page
 * isn't part of this crawl, hasn't finished yet, or is from an old crawl without `result`.
 */
export async function getSiteScanPageResult(
  siteScanId: string,
  url: string,
): Promise<ScanResult | null> {
  const page = await prisma.siteScanPage.findFirst({
    where: { siteScanId, url, status: "done" },
    select: { result: true },
  });
  if (!page?.result) return null;
  return page.result as unknown as ScanResult;
}
