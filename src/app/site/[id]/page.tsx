import { notFound } from "next/navigation";
import { getSiteScan } from "@/lib/site-scans";
import type { CrawlSnapshot } from "../shared";
import { SiteCrawlView } from "./site-crawl-view";

export default async function SiteScanReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await getSiteScan(id);
  if (!snap) notFound();

  const initial: CrawlSnapshot = { ...snap, createdAt: snap.createdAt.toISOString() };
  return <SiteCrawlView initial={initial} />;
}
