import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { siteRatelimit } from "@/lib/redis";
import { discoverUrls, normalizeRoot } from "@/lib/scan/discover";
import { createSiteScan } from "@/lib/site-scans";
import { canFanOut, enqueuePageScans } from "@/lib/qstash";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Missing 'url'." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (siteRatelimit) {
    const { success } = await siteRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many site scans. Try again in a few minutes." },
        { status: 429 },
      );
    }
  }

  const root = normalizeRoot(body.url);
  try {
    new URL(root);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const urls = await discoverUrls(root);
  const userId = (await auth())?.user?.id ?? null;
  const id = await createSiteScan(root, urls, userId);

  const jobs = urls.map((url) => ({ siteScanId: id, url }));

  if (canFanOut()) {
    try {
      await enqueuePageScans(jobs);
    } catch (e) {
      console.error("QStash fan-out failed, falling back to inline:", e);
      const { processPagesInline } = await import("@/lib/site-scan-runner");
      void processPagesInline(id, urls);
    }
  } else {
    // Dev/local sem QStash: processa inline (fire-and-forget; o front faz polling).
    const { processPagesInline } = await import("@/lib/site-scan-runner");
    void processPagesInline(id, urls);
  }

  return NextResponse.json({ id, totalPages: urls.length });
}
