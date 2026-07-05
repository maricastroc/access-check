import { prisma } from "@/lib/prisma";

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
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
