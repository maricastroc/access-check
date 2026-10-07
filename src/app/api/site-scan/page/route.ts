import { NextResponse } from "next/server";
import { verifyQstashSignature } from "@/lib/qstash";
import { scanOnePage } from "@/lib/site-scan-runner";
import { DEFAULT_REPORT_LOCALE, isReportLocale } from "@/lib/i18n/locale";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const raw = await req.text();

  const valid = await verifyQstashSignature(req, raw);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let job: { siteScanId?: string; url?: string; locale?: unknown };
  try {
    job = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!job.siteScanId || !job.url) {
    return NextResponse.json({ error: "Missing siteScanId or url." }, { status: 400 });
  }

  const locale = isReportLocale(job.locale) ? job.locale : DEFAULT_REPORT_LOCALE;
  await scanOnePage(job.siteScanId, job.url, locale);
  return NextResponse.json({ ok: true });
}
