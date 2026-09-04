import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clientKey, siteScanRateLimit } from "@/lib/rate-limit";
import { discoverUrls, normalizeRoot } from "@/lib/scan/discover";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";
import { createSiteScan, failSiteScan } from "@/lib/site-scans";
import { canFanOut, enqueuePageScans } from "@/lib/qstash";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "We couldn't read that request. Please reload the page and try again." },
      { status: 400 },
    );
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "No web address was provided. Enter a site address and try again." },
      { status: 400 },
    );
  }

  if ((await siteScanRateLimit.check(clientKey(req))) === "limited") {
    return NextResponse.json(
      { error: "Too many site audits in a short time. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const root = normalizeRoot(body.url);
  try {
    await assertPublicUrl(root);
  } catch (err) {
    const message = err instanceof BlockedUrlError
      ? err.message
      : "That doesn't look like a valid web address. Check it and try again.";
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
      console.error("QStash fan-out failed:", e);
      if (onServerless) {
        await failSiteScan(
          id,
          "Site audits are temporarily unavailable. Please audit a single page instead, or try again later.",
        );
      } else {
        await runInline();
      }
    }
  } else if (onServerless) {
    console.error("Site scan unavailable: QStash env vars are not configured.");
    await failSiteScan(
      id,
      "Site audits aren't available right now. Please audit a single page instead.",
    );
  } else {
    await runInline();
  }

  return NextResponse.json({ id, totalPages: urls.length });
}
