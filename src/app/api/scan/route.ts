import { NextResponse } from "next/server";
import { runScan, normalizeUrl, ScanFailure } from "@/lib/scan/scan";
import type { ScanErrorCode, ScanResult } from "@/lib/scan/types";
import type { ScanStreamEvent } from "@/lib/scan/stream";
import { auth } from "@/auth";
import { findRecentScan, saveScan } from "@/lib/scans";
import { cacheGet, cacheSet } from "@/lib/redis";
import { SCAN_FRESH_MS, SCAN_FRESH_SECONDS, trimForCache } from "@/lib/scan/cache-policy";
import { SCORING_VERSION } from "@/lib/scan/scored";
import { clientKey, scanRateLimit } from "@/lib/rate-limit";
import { assertPublicUrl, BlockedUrlError } from "@/lib/scan/ssrf";
import { logError } from "@/lib/observability/log";
import { localeFromRequest, translateForRequest } from "@/lib/i18n/server";
import type { ReportLocale } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/t";

export const runtime = "nodejs";
export const maxDuration = 60;

function scanCacheKey(url: string, locale: ReportLocale): string {
  return `scan:v${SCORING_VERSION}:${locale}:${url}`;
}

const SCAN_BUDGET_MS = 40_000;
const HARD_DEADLINE_MS = 46_000;

function fail(error: string, code: ScanErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function streamResponse(
  produce: (send: (event: ScanStreamEvent) => void) => void | Promise<void>,
  t: Translate,
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
        const message = err instanceof Error ? err.message : t("api.internal");
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
  const locale = localeFromRequest(req);
  const t = translateForRequest(req);
  let body: { url?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail(t("api.badRequest"), "invalid-url", 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return fail(t("api.noAddress"), "invalid-url", 400);
  }

  if ((await scanRateLimit.check(clientKey(req))) === "limited") {
    return fail(t("api.rateLimited"), "rate-limited", 429);
  }

  const url = normalizeUrl(body.url);

  try {
    await assertPublicUrl(url, t);
  } catch (err) {
    const blocked = err instanceof BlockedUrlError;
    return fail(
      blocked ? err.message : t("api.invalidAddress"),
      blocked ? err.code : "invalid-url",
      400,
    );
  }

  const userId = (await auth())?.user?.id;

  if (body.force !== true) {
    const reused = userId
      ? await findRecentScan(userId, url, SCAN_FRESH_MS)
      : await cacheGet<ScanResult>(scanCacheKey(url, locale));

    if (reused) {
      const at = reused.scannedAt ? Date.parse(reused.scannedAt) : NaN;
      console.log(
        JSON.stringify({
          event: "scan",
          url,
          status: "reused",
          from: userId ? "history" : "cache",
          ageMs: Number.isNaN(at) ? null : Date.now() - at,
        }),
      );
      return streamResponse((send) => {
        send({ type: "result", result: reused });
      }, t);
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
      locale,
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
        send({ type: "result", result: outcome.result });
        log(outcome.result.partial ? "partial" : "ok", {
          score: outcome.result.score,
          warnings: outcome.result.warnings?.map((w) => w.code) ?? [],
        });

        if (userId) {
          try {
            await saveScan(userId, outcome.result);
          } catch (e) {
            logError("scan.history.failed", e);
          }
        } else if (!outcome.result.partial) {
          await cacheSet(
            scanCacheKey(url, locale),
            trimForCache(outcome.result),
            SCAN_FRESH_SECONDS,
          );
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
          error: t("api.tooSlow"),
          code: "timeout",
        });
        log("deadline");
        return;
      }

      const error = outcome.error;
      const code: ScanErrorCode = error instanceof ScanFailure ? error.code : "internal";
      const message = error instanceof ScanFailure ? error.message : t("api.auditFailed");
      send({ type: "error", error: message, code });
      log("error", { code, detail: error instanceof Error ? error.message : String(error) });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, t);
}
