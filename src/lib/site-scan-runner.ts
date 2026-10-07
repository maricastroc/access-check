import { runScan, ScanFailure } from "@/lib/scan/scan";
import { CRAWL_SCAN_OPTS, completePage, markPageRunning } from "@/lib/site-scans";
import { logError } from "@/lib/observability/log";
import type { ReportLocale } from "./i18n/locale";
import { translator } from "./i18n/t";

export async function scanOnePage(
  siteScanId: string,
  url: string,
  locale: ReportLocale,
): Promise<void> {
  await markPageRunning(siteScanId, url);
  try {
    const result = await runScan(url, { ...CRAWL_SCAN_OPTS, locale, blockPrivateHosts: true });
    await completePage(siteScanId, url, { ok: true, result });
  } catch (e) {
    if (e instanceof ScanFailure) {
      await completePage(siteScanId, url, { ok: false, error: e.message });
      return;
    }
    logError("scan.failed", e, { siteScanId, url });
    await completePage(siteScanId, url, {
      ok: false,
      error: translator(locale)("scanFail.generic"),
    });
  }
}

export async function processPagesInline(
  siteScanId: string,
  urls: string[],
  locale: ReportLocale,
): Promise<void> {
  for (const url of urls) {
    await scanOnePage(siteScanId, url, locale);
  }
}
