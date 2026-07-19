import { NextResponse } from "next/server";
import { runScan, normalizeUrl } from "@/lib/scan/scan";
import type { ScanResult } from "@/lib/scan/types";
import { auth } from "@/auth";
import { saveScan } from "@/lib/scans";
import { redis, ratelimit, rateLimitMissingInProd } from "@/lib/redis";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_SECONDS = 5 * 60;

type CachedScan = Omit<ScanResult, "screenshot">;

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

  if (rateLimitMissingInProd()) {
    return NextResponse.json(
      { error: "Rate limiting is unavailable right now. Please try again later." },
      { status: 503 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many scans. Try again in a minute." },
        { status: 429 },
      );
    }
  }

  const url = normalizeUrl(body.url);

  try {
    await assertPublicUrl(url);
  } catch (err) {
    const message = err instanceof BlockedUrlError ? err.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = (await auth())?.user?.id;

  if (!userId && redis) {
    const cached = await redis.get<CachedScan>(`scan:${url}`);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const result = await runScan(url, { blockPrivateHosts: true });
    if (userId) {
      try {
        await saveScan(userId, result);
      } catch (e) {
        console.error("Failed to save scan to history:", e);
      }
    } else if (redis) {
      const { screenshot: _screenshot, ...light } = result;
      void _screenshot;
      try {
        await redis.set(`scan:${url}`, light, { ex: CACHE_TTL_SECONDS });
      } catch (e) {
        console.error("Failed to cache scan result:", e);
      }
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during scan.";
    return NextResponse.json({ error: `Could not scan this page. ${message}` }, { status: 502 });
  }
}
