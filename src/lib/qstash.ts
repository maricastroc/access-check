import { Client, Receiver } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN;
const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

export const qstash = token ? new Client({ token }) : null;

export const qstashReceiver =
  currentSigningKey && nextSigningKey
    ? new Receiver({ currentSigningKey, nextSigningKey })
    : null;

export function appBaseUrl(): string | null {
  const explicit = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
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
      flowControl: { key: "crawl", parallelism: 3 },
    })),
  );
}

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
