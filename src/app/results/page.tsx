import { ResultsView } from "./results-view";
import { getSiteScanPageResult } from "@/lib/site-scans";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; site?: string }>;
}) {
  const { url, site } = await searchParams;
  const initialResult = site && url ? await getSiteScanPageResult(site, url) : null;

  return <ResultsView initialUrl={url ?? ""} siteId={site ?? null} initialResult={initialResult} />;
}
