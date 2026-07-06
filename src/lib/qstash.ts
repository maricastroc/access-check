import { Client, Receiver } from "@upstash/qstash";

// Fan-out do crawl: uma mensagem QStash por página → cada uma vira uma
// invocação curta de /api/site-scan/page (respeita o teto de 60s da Vercel).
// Sem QStash configurado, `canFanOut()` é false e o crawl processa inline
// (fallback de dev) — mesma filosofia de degradação graciosa do Redis.

const token = process.env.QSTASH_TOKEN;
const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

export const qstash = token ? new Client({ token }) : null;

export const qstashReceiver =
  currentSigningKey && nextSigningKey
    ? new Receiver({ currentSigningKey, nextSigningKey })
    : null;

/** URL pública desta app — o QStash precisa dela pra chamar o worker de volta. */
export function appBaseUrl(): string | null {
  const explicit = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

/** Só dá pra fazer fan-out real com client + URL de callback pública. */
export function canFanOut(): boolean {
  return qstash !== null && appBaseUrl() !== null;
}

export type PageJob = { siteScanId: string; url: string };

/** Enfileira o scan de cada página numa única chamada em lote ao QStash. */
export async function enqueuePageScans(jobs: PageJob[]): Promise<void> {
  if (!qstash) throw new Error("QStash não configurado.");
  const base = appBaseUrl();
  if (!base) throw new Error("APP_URL não configurada.");
  if (jobs.length === 0) return;

  await qstash.batchJSON(
    jobs.map((body) => ({
      url: `${base}/api/site-scan/page`,
      body,
      retries: 1,
      // Limita quantos workers Chromium rodam em paralelo — protege a memória/
      // custo das funções serverless quando um site tem muitas páginas.
      flowControl: { key: "crawl", parallelism: 3 },
    })),
  );
}

/**
 * Valida a assinatura do QStash num request do worker. Retorna true quando o
 * receiver não está configurado (modo dev/inline) pra não travar o fluxo local.
 */
export async function verifyQstashSignature(req: Request, body: string): Promise<boolean> {
  if (!qstashReceiver) return true;
  const signature = req.headers.get("upstash-signature");
  if (!signature) return false;
  try {
    return await qstashReceiver.verify({ signature, body });
  } catch {
    return false;
  }
}
