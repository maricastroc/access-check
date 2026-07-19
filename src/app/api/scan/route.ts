import { NextResponse } from "next/server";
import { runScan, normalizeUrl } from "@/lib/scan/scan";
import type { ScanPhase, ScanResult } from "@/lib/scan/types";
import { auth } from "@/auth";
import { saveScan } from "@/lib/scans";
import { redis, ratelimit, rateLimitMissingInProd } from "@/lib/redis";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_SECONDS = 5 * 60;

type CachedScan = Omit<ScanResult, "screenshot">;

/** One newline-delimited JSON message the client reads from the scan stream. */
export type ScanStreamEvent =
  | { type: "phase"; phase: ScanPhase }
  | { type: "result"; result: ScanResult | CachedScan }
  | { type: "error"; error: string };

/**
 * Wraps a producer in an NDJSON streaming Response. `send` serializes one event
 * per line; the stream closes when the producer resolves.
 */
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
      // Serve cache hits as a single-line stream so the client has one code path.
      return streamResponse((send) => {
        send({ type: "result", result: cached });
      });
    }
  }

  // Stream real progress: phase events as the scan runs, then the result. The
  // heavy work (persistence/cache) happens after the result is sent, off the
  // critical path the user is waiting on.
  return streamResponse(async (send) => {
    try {
      const result = await runScan(url, {
        blockPrivateHosts: true,
        onPhase: (p) => send({ type: "phase", phase: p }),
      });
      send({ type: "result", result });

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error during scan.";
      send({ type: "error", error: `Could not scan this page. ${message}` });
    }
  });
}
