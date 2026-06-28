import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Redis distribuído (Upstash via HTTP — serverless-friendly, sem pool de
// conexões TCP). Na Vercel, a integração Upstash injeta as credenciais REST
// com nomes no padrão Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN),
// possivelmente com um prefixo (ex. STORAGE_). Lemos os nomes possíveis pra
// funcionar independente de como foram injetadas. (KV_URL / REDIS_URL são
// strings TCP e NÃO servem pro cliente HTTP; ignoramos.)
//
// Sem nenhuma var (ex.: dev local sem `vercel env pull`), tudo vira no-op:
// `redis` e `ratelimit` ficam null e a rota cai no comportamento "sem cache /
// sem rate-limit", em vez de quebrar.
const url =
  process.env.KV_REST_API_URL ??
  process.env.STORAGE_KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ??
  process.env.STORAGE_KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// Rate-limit global por IP: 5 scans / min, sliding window. Substitui o balde
// em memória (que, em serverless multi-instância, não limitava de verdade).
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "scan",
      analytics: false,
    })
  : null;
