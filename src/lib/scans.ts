import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ScanResult } from "@/lib/scan/types";

/** Decodifica um data URL base64 em bytes + mimeType. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: Uint8Array<ArrayBuffer> } | null {
  // base64 não tem quebras de linha, então `.` (sem flag `s`) basta.
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  // Aloca um Uint8Array novo (backing ArrayBuffer) — é o que o tipo Bytes do
  // Prisma espera, diferente do Buffer (ArrayBufferLike).
  const bytes = Buffer.from(m[2], "base64");
  const data = new Uint8Array(bytes.length);
  data.set(bytes);
  return { mimeType: m[1], data };
}

/**
 * Persiste um scan no histórico do usuário. O screenshot (data URL) é
 * decodificado e guardado como bytes numa tabela à parte; o JSON do resultado
 * é salvo SEM o screenshot — ele vira a rota /api/scan/<id>/screenshot, e assim
 * queries de lista/histórico nunca arrastam o blob.
 */
export async function saveScan(userId: string, result: ScanResult): Promise<string> {
  const img = result.screenshot ? parseDataUrl(result.screenshot) : null;
  const storedResult = { ...result, screenshot: null };

  const scan = await prisma.scan.create({
    data: {
      userId,
      url: result.url,
      finalUrl: result.finalUrl,
      title: result.title,
      score: result.score,
      // Contagens desnormalizadas pra lista/ordenação/tendência sem parsear JSON.
      critical: result.counts.critical,
      serious: result.counts.serious,
      moderate: result.counts.moderate,
      minor: result.counts.minor,
      passed: result.counts.passed,
      durationMs: result.durationMs,
      result: storedResult as unknown as Prisma.InputJsonValue,
      ...(img && { screenshot: { create: { data: img.data, mimeType: img.mimeType } } }),
    },
    select: { id: true },
  });

  return scan.id;
}

/** Item leve pra listagem do histórico — sem o JSON do resultado nem o blob. */
export type ScanListItem = {
  id: string;
  url: string;
  finalUrl: string;
  title: string;
  score: number;
  counts: { critical: number; serious: number; moderate: number; minor: number; passed: number };
  createdAt: Date;
};

/** Scans do usuário, mais recentes primeiro. Só metadados (lista nunca puxa blob). */
export async function getUserScans(userId: string): Promise<ScanListItem[]> {
  const scans = await prisma.scan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      finalUrl: true,
      title: true,
      score: true,
      critical: true,
      serious: true,
      moderate: true,
      minor: true,
      passed: true,
      createdAt: true,
    },
  });

  return scans.map((s) => ({
    id: s.id,
    url: s.url,
    finalUrl: s.finalUrl,
    title: s.title,
    score: s.score,
    counts: {
      critical: s.critical,
      serious: s.serious,
      moderate: s.moderate,
      minor: s.minor,
      passed: s.passed,
    },
    createdAt: s.createdAt,
  }));
}

/** Reconstrói o ScanResult salvo, apontando o screenshot pra rota de imagem. */
function hydrate(id: string, result: unknown): ScanResult {
  return { ...(result as ScanResult), screenshot: `/api/scan/${id}/screenshot` };
}

export type SavedReport = {
  result: ScanResult;
  /** Scan imediatamente anterior da MESMA URL, pra comparação. */
  previous: { result: ScanResult; at: Date } | null;
};

/**
 * Relatório salvo (só do dono) + o scan anterior da mesma URL, quando existe —
 * a base da comparação/regressão. Usa o índice (userId, url, createdAt).
 */
export async function getSavedReport(id: string, userId: string): Promise<SavedReport | null> {
  const scan = await prisma.scan.findFirst({
    where: { id, userId },
    select: { id: true, url: true, createdAt: true, result: true },
  });
  if (!scan) return null;

  const prev = await prisma.scan.findFirst({
    where: { userId, url: scan.url, createdAt: { lt: scan.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, createdAt: true },
  });

  return {
    result: hydrate(scan.id, scan.result),
    previous: prev ? { result: hydrate(prev.id, prev.result), at: prev.createdAt } : null,
  };
}
