import { NextResponse } from "next/server";
import { getSiteScan } from "@/lib/site-scans";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getSiteScan(id);
  if (!snap) {
    return NextResponse.json({ error: "Site scan not found." }, { status: 404 });
  }
  return NextResponse.json(snap);
}
