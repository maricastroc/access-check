import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ScanResult } from "@/lib/scan/types";

function parseDataUrl(dataUrl: string): { mimeType: string; data: Uint8Array<ArrayBuffer> } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  const data = new Uint8Array(bytes.length);
  data.set(bytes);
  return { mimeType: m[1], data };
}

export async function saveScan(userId: string, result: ScanResult): Promise<string> {
  const img = result.screenshot ? parseDataUrl(result.screenshot) : null;
  const storedResult = { ...result, screenshot: null };

  const scan = await prisma.scan.create({
    data: {
      userId,
      url: result.url,
      finalUrl: result.finalUrl,
      title: result.title,
      score: result.score,
      critical: result.counts.critical,
      serious: result.counts.serious,
      moderate: result.counts.moderate,
      minor: result.counts.minor,
      passed: result.counts.passed,
      durationMs: result.durationMs,
      result: storedResult as unknown as Prisma.InputJsonValue,
      ...(img && { screenshot: { create: { data: img.data, mimeType: img.mimeType } } }),
    },
    select: { id: true },
  });

  return scan.id;
}

/** Lightweight item for the history listing — without the result JSON or the blob. */
export type ScanListItem = {
  id: string;
  url: string;
  finalUrl: string;
  title: string;
  score: number;
  counts: { critical: number; serious: number; moderate: number; minor: number; passed: number };
  createdAt: Date;
};

/** User's scans, most recent first. Metadata only (the list never pulls the blob). */
export async function getUserScans(userId: string): Promise<ScanListItem[]> {
  const scans = await prisma.scan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      finalUrl: true,
      title: true,
      score: true,
      critical: true,
      serious: true,
      moderate: true,
      minor: true,
      passed: true,
      createdAt: true,
    },
  });

  return scans.map((s) => ({
    id: s.id,
    url: s.url,
    finalUrl: s.finalUrl,
    title: s.title,
    score: s.score,
    counts: {
      critical: s.critical,
      serious: s.serious,
      moderate: s.moderate,
      minor: s.minor,
      passed: s.passed,
    },
    createdAt: s.createdAt,
  }));
}

function hydrate(id: string, result: unknown): ScanResult {
  const r = result as ScanResult;
  return {
    ...r,
    screenshot: `/api/scan/${id}/screenshot`,
    incomplete: r.incomplete ?? [],
    bestPractice: r.bestPractice ?? [],
    counts: {
      ...r.counts,
      bestPractice: r.counts.bestPractice ?? 0,
      manualReview: r.counts.manualReview ?? 0,
    },
  };
}

export type SavedReport = {
  result: ScanResult;
  /** The immediately preceding scan of the SAME URL, for comparison. */
  previous: { result: ScanResult; at: Date } | null;
};

/**
 * Saved report (owner only) + the previous scan of the same URL, when it exists —
 * the basis for comparison/regression. Uses the (userId, url, createdAt) index.
 */
export async function getSavedReport(id: string, userId: string): Promise<SavedReport | null> {
  const scan = await prisma.scan.findFirst({
    where: { id, userId },
    select: { id: true, url: true, createdAt: true, result: true },
  });
  if (!scan) return null;

  const prev = await prisma.scan.findFirst({
    where: { userId, url: scan.url, createdAt: { lt: scan.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, createdAt: true },
  });

  return {
    result: hydrate(scan.id, scan.result),
    previous: prev ? { result: hydrate(prev.id, prev.result), at: prev.createdAt } : null,
  };
}
