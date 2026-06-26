import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { PrismaClient } from "@/generated/prisma/client";

// O driver serverless do Neon fala com o banco por WebSocket — ideal pra
// funções serverless da Vercel (sem o problema de conexões TCP em cold start).
// Node 22+ já tem WebSocket global; caímos pro 'ws' só onde não houver.
if (!globalThis.WebSocket) neonConfig.webSocketConstructor = ws;

// Singleton: em dev o HMR recria módulos a cada save; sem isso, abriríamos um
// novo PrismaClient (e um novo pool) por reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
