import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserScans } from "@/lib/scans";
import { SiteHeader } from "@/components/home/site-header";
import { HistoryList } from "./history-list";

export const runtime = "nodejs";

export default async function HistoryPage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/login");

  const scans = await getUserScans(userId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <SiteHeader />
      <Suspense>
        <HistoryList scans={scans} />
      </Suspense>
    </div>
  );
}
