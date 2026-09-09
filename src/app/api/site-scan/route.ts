import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clientKey, siteScanRateLimit } from "@/lib/rate-limit";
import { discoverUrls, normalizeRoot } from "@/lib/scan/discover";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";
import { createSiteScan, failSiteScan } from "@/lib/site-scans";
import { canFanOut, enqueuePageScans } from "@/lib/qstash";
import { log, logError } from "@/lib/observability/log";
import { translateForRequest } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const t = translateForRequest(req);
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("api.badRequest") }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: t("api.site.noAddress") }, { status: 400 });
  }

  if ((await siteScanRateLimit.check(clientKey(req))) === "limited") {
    return NextResponse.json({ error: t("api.site.rateLimited") }, { status: 429 });
  }

  const root = normalizeRoot(body.url);
  try {
    await assertPublicUrl(root, t);
  } catch (err) {
    const message = err instanceof BlockedUrlError ? err.message : t("api.invalidAddress");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const urls = await discoverUrls(root);
  const userId = (await auth())?.user?.id ?? null;
  const id = await createSiteScan(root, urls, userId);

  const jobs = urls.map((url) => ({ siteScanId: id, url }));

  const onServerless = Boolean(process.env.VERCEL);

  async function runInline() {
    const { processPagesInline } = await import("@/lib/site-scan-runner");
    void processPagesInline(id, urls);
  }

  if (canFanOut()) {
    try {
      await enqueuePageScans(jobs);
    } catch (e) {
      logError("queue.dispatch.failed", e);
      if (onServerless) {
        await failSiteScan(id, t("api.site.unavailable"));
      } else {
        await runInline();
      }
    }
  } else if (onServerless) {
    log("error", "queue.unconfigured");
    await failSiteScan(id, t("api.site.disabled"));
  } else {
    await runInline();
  }

  return NextResponse.json({ id, totalPages: urls.length });
}
