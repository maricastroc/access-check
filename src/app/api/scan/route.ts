import { NextResponse } from "next/server";
import { runScan, normalizeUrl } from "@/lib/scan/scan";
import type { ScanResult } from "@/lib/scan/types";
import { auth } from "@/auth";
import { saveScan } from "@/lib/scans";
import { redis, ratelimit } from "@/lib/redis";

// Playwright precisa do runtime Node (não Edge) e de tempo pra renderizar.
export const runtime = "nodejs";
export const maxDuration = 60;

// Cache anônimo: TTL de 5 min, agora no Redis (Upstash) pra valer entre
// instâncias. O Redis expira a chave sozinho (`ex`), então não há mais
// aritmética de timestamp aqui. Sem Redis configurado, `redis` é null e o
// fluxo simplesmente roda sem cache.
const CACHE_TTL_SECONDS = 5 * 60;

// `ScanResult` sem o screenshot — é o que vai pro cache. O data URL base64 da
// imagem pode passar do limite de tamanho por requisição do Upstash e é caro
// de trafegar; o blob já vive à parte (ver saveScan), então o cache não precisa
// dele. A UI anônima exibe o resultado sem o screenshot do cache.
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many scans. Try again in a minute." }, { status: 429 });
    }
  }

  const url = normalizeUrl(body.url);

  try {
    // valida URL
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const userId = (await auth())?.user?.id;

  // O cache é otimização do fluxo anônimo. Usuário logado sempre roda um scan
  // fresh — pra o histórico ser um retrato real do momento — e o persiste.
  if (!userId && redis) {
    const cached = await redis.get<CachedScan>(`scan:${url}`);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const result = await runScan(url);
    if (userId) {
      // Falhar ao salvar não deve derrubar o scan — o resultado já é válido.
      try {
        await saveScan(userId, result);
      } catch (e) {
        console.error("Failed to save scan to history:", e);
      }
    } else if (redis) {
      // Cacheia sem o screenshot (ver CachedScan). Falha de cache nunca deve
      // derrubar o scan — o resultado já é válido.
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
