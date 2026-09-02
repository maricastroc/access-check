import { NextResponse } from "next/server";
import { runScan, normalizeUrl } from "@/lib/scan/scan";
import type { ScanResult } from "@/lib/scan/types";
import type { ScanStreamEvent } from "@/lib/scan/stream";
import { auth } from "@/auth";
import { saveScan } from "@/lib/scans";
import { cacheGet, cacheSet } from "@/lib/redis";
import { clientKey, scanRateLimit } from "@/lib/rate-limit";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_SECONDS = 5 * 60;

type CachedScan = Omit<ScanResult, "screenshot">;

function streamResponse(
  produce: (send: (event: ScanStreamEvent) => void) => void | Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ScanStreamEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await produce(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

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

  if ((await scanRateLimit.check(clientKey(req))) === "limited") {
    return NextResponse.json({ error: "Too many scans. Try again in a minute." }, { status: 429 });
  }

  const url = normalizeUrl(body.url);

  try {
    await assertPublicUrl(url);
  } catch (err) {
    const message = err instanceof BlockedUrlError ? err.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = (await auth())?.user?.id;

  if (!userId) {
    const cached = await cacheGet<CachedScan>(`scan:${url}`);
    if (cached) {
      return streamResponse((send) => {
        send({ type: "result", result: cached });
      });
    }
  }

  return streamResponse(async (send) => {
    try {
      const result = await runScan(url, {
        blockPrivateHosts: true,
        onPhase: (p) => send({ type: "phase", phase: p }),
        onCore: (core) => send({ type: "core", result: core }),
      });
      send({ type: "result", result });

      if (userId) {
        try {
          await saveScan(userId, result);
        } catch (e) {
          console.error("Failed to save scan to history:", e);
        }
      } else {
        const { screenshot: _screenshot, ...light } = result;
        void _screenshot;
        await cacheSet(`scan:${url}`, light, CACHE_TTL_SECONDS);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error during scan.";
      send({ type: "error", error: `Could not scan this page. ${message}` });
    }
  });
}
