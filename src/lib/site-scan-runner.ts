import { runScan } from "@/lib/scan/scan";
import { CRAWL_SCAN_OPTS, completePage, markPageRunning } from "@/lib/site-scans";

// Escaneia UMA página do crawl e grava o resultado. Nunca lança: erros viram
// status "failed" na página, pra um site meio quebrado não derrubar o job.
export async function scanOnePage(siteScanId: string, url: string): Promise<void> {
  await markPageRunning(siteScanId, url);
  try {
    const result = await runScan(url, CRAWL_SCAN_OPTS);
    await completePage(siteScanId, url, { ok: true, result });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Scan failed.";
    await completePage(siteScanId, url, { ok: false, error });
  }
}

// Fallback de dev (sem QStash): processa as páginas em série no mesmo processo.
export async function processPagesInline(siteScanId: string, urls: string[]): Promise<void> {
  for (const url of urls) {
    await scanOnePage(siteScanId, url);
  }
}
