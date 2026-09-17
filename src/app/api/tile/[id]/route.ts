import { readTile } from "@/lib/scan/tile-store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tile = await readTile(id);
  if (!tile) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(tile.data, "base64"), {
    headers: {
      "Content-Type": tile.mimeType,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
