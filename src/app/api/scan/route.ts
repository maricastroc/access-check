import { NextResponse } from "next/server";
import { runScan, normalizeUrl, ScanFailure } from "@/lib/scan/scan";
import type { ScanErrorCode, ScanResult } from "@/lib/scan/types";
import type { ScanStreamEvent } from "@/lib/scan/stream";
import { auth } from "@/auth";
import { saveScan } from "@/lib/scans";
import { cacheGet, cacheSet } from "@/lib/redis";
import { clientKey, scanRateLimit } from "@/lib/rate-limit";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_SECONDS = 5 * 60;
const SCAN_BUDGET_MS = 40_000;
const HARD_DEADLINE_MS = 46_000;

type CachedScan = Omit<ScanResult, "screenshot">;

function fail(error: string, code: ScanErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function streamResponse(
  produce: (send: (event: ScanStreamEvent) => void) => void | Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: ScanStreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await produce(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        send({ type: "error", error: message, code: "internal" });
      } finally {
        closed = true;
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
    return fail("Invalid JSON body.", "invalid-url", 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return fail("Missing 'url'.", "invalid-url", 400);
  }

  if ((await scanRateLimit.check(clientKey(req))) === "limited") {
    return fail("Too many scans. Try again in a minute.", "rate-limited", 429);
  }

  const url = normalizeUrl(body.url);

  try {
    await assertPublicUrl(url);
  } catch (err) {
    const blocked = err instanceof BlockedUrlError;
    return fail(blocked ? err.message : "Invalid URL.", blocked ? err.code : "invalid-url", 400);
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
    const startedAt = Date.now();
    let core: ScanResult | null = null;
    let timings: Record<string, number> = {};

    const log = (status: string, extra: Record<string, unknown> = {}) => {
      console.log(
        JSON.stringify({
          event: "scan",
          url,
          status,
          elapsedMs: Date.now() - startedAt,
          timings,
          ...extra,
        }),
      );
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<{ kind: "expired" }>((resolve) => {
      timer = setTimeout(() => resolve({ kind: "expired" }), HARD_DEADLINE_MS);
    });

    const scan = runScan(url, {
      blockPrivateHosts: true,
      budgetMs: SCAN_BUDGET_MS,
      onPhase: (p) => send({ type: "phase", phase: p }),
      onCore: (c) => {
        core = c;
        send({ type: "core", result: c });
      },
      onTimings: (t) => {
        timings = t;
      },
    }).then(
      (result) => ({ kind: "done" as const, result }),
      (error: unknown) => ({ kind: "failed" as const, error }),
    );

    try {
      const outcome = await Promise.race([scan, deadline]);

      if (outcome.kind === "done") {
        const { screenshot: _screenshot, ...light } = outcome.result;
        void _screenshot;
        send({ type: "result", result: outcome.result });
        log(outcome.result.partial ? "partial" : "ok", {
          score: outcome.result.score,
          warnings: outcome.result.warnings?.map((w) => w.code) ?? [],
        });

        if (userId) {
          try {
            await saveScan(userId, outcome.result);
          } catch (e) {
            console.error("Failed to save scan to history:", e);
          }
        } else {
          await cacheSet(`scan:${url}`, light, CACHE_TTL_SECONDS);
        }
        return;
      }

      if (core) {
        const salvaged: ScanResult = core;
        send({ type: "result", result: { ...salvaged, partial: true } });
        log(outcome.kind === "expired" ? "deadline-partial" : "failed-partial");
        return;
      }

      if (outcome.kind === "expired") {
        send({
          type: "error",
          error: "This page took longer than we can wait. Try a lighter page.",
          code: "timeout",
        });
        log("deadline");
        return;
      }

      const error = outcome.error;
      const code: ScanErrorCode = error instanceof ScanFailure ? error.code : "internal";
      const message =
        error instanceof ScanFailure
          ? error.message
          : "Could not scan this page. Please try another URL.";
      send({ type: "error", error: message, code });
      log("error", { code, detail: error instanceof Error ? error.message : String(error) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
}
