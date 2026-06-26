import { handlers } from "@/auth";

// Prisma + driver Neon (ws) precisam do runtime Node, não Edge.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
