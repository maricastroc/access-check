import { prisma } from "@/lib/prisma";

// Prisma precisa do runtime Node.
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shot = await prisma.screenshot.findUnique({ where: { scanId: id } });
  if (!shot?.data) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(shot.data), {
    headers: {
      "Content-Type": shot.mimeType,
      // Imutável por scan → cache agressivo (a imagem nunca muda pra um dado id).
      // max-age: cache do browser. s-maxage: CDN da Vercel (1ª carga paga uma vez
      // globalmente; as próximas vêm do edge, sem tocar o Postgres).
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
