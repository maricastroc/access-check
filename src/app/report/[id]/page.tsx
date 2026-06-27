import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { auth } from "@/auth";
import { getSavedReport } from "@/lib/scans";
import { diffScans } from "@/lib/scan/diff";
import { PrintStyles } from "../chrome";
import { SummaryPage } from "../summary-page";
import { FindingsPage } from "../findings-page";
import { ProgressPage } from "../progress-page";
import { ComparisonCard } from "./comparison-card";

// Prisma precisa do runtime Node.
export const runtime = "nodejs";

export default async function SavedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/login");

  const saved = await getSavedReport(id, userId);
  if (!saved) notFound();

  const { result, previous } = saved;
  const diff = previous ? diffScans(previous.result, result) : null;

  return (
    <div className="ac-canvas min-h-screen bg-canvas font-sans text-ink">
      <PrintStyles />

      <header className="ac-toolbar sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-card px-7">
        <Link
          href="/history"
          className="flex h-[34px] items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Back to history
        </Link>
        <span className="text-[13px] font-medium">Saved report · {result.title}</span>
      </header>

      <div className="flex flex-col items-center gap-8 overflow-x-auto px-5 py-10">
        {diff && previous && <ComparisonCard diff={diff} previousAt={previous.at} />}
        <SummaryPage result={result} />
        <FindingsPage result={result} />
        <ProgressPage result={result} />
      </div>
    </div>
  );
}
