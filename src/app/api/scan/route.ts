import { NextResponse } from "next/server";
import { runScan, normalizeUrl } from "@/lib/scan/scan";
import type { ScanResult } from "@/lib/scan/types";

// Playwright precisa do runtime Node (não Edge) e de tempo pra renderizar.
export const runtime = "nodejs";
export const maxDuration = 60;

// --- cache em memória (TTL 5 min) ---
const CACHE_TTL = 5 * 60_000;
const cache = new Map<string, { at: number; result: ScanResult }>();

// --- rate-limit leve por IP (5 / min) ---
const RATE_MAX = 5;
const RATE_WINDOW = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
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

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many scans. Try again in a minute." },
      { status: 429 },
    );
  }

  const url = normalizeUrl(body.url);

  try {
    // valida URL
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.result);
  }

  try {
    const result = await runScan(url);
    cache.set(url, { at: Date.now(), result });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during scan.";
    return NextResponse.json(
      { error: `Could not scan this page. ${message}` },
      { status: 502 },
    );
  }
}
