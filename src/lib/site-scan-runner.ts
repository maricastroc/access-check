import { runScan } from "@/lib/scan/scan";
import { CRAWL_SCAN_OPTS, completePage, markPageRunning } from "@/lib/site-scans";
import { translator } from "./i18n/t";

export async function scanOnePage(siteScanId: string, url: string): Promise<void> {
  await markPageRunning(siteScanId, url);
  try {
    const result = await runScan(url, { ...CRAWL_SCAN_OPTS, blockPrivateHosts: true });
    await completePage(siteScanId, url, { ok: true, result });
  } catch (e) {
    const error = e instanceof Error ? e.message : translator()("scanFail.generic");
    await completePage(siteScanId, url, { ok: false, error });
  }
}

export async function processPagesInline(siteScanId: string, urls: string[]): Promise<void> {
  for (const url of urls) {
    await scanOnePage(siteScanId, url);
  }
}
