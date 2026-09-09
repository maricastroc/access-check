import { NextResponse } from "next/server";
import { getSiteScan } from "@/lib/site-scans";
import { translateForRequest } from "@/lib/i18n/server";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getSiteScan(id);
  if (!snap) {
    return NextResponse.json({ error: translateForRequest(req)("site.notFound") }, { status: 404 });
  }
  return NextResponse.json(snap);
}
