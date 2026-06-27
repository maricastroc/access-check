import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserScans, type ScanListItem } from "@/lib/scans";
import { SiteHeader } from "@/components/home/site-header";
import { ClearHistoryButton, DeleteScanButton } from "./history-buttons";

// Prisma precisa do runtime Node.
export const runtime = "nodejs";

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function scoreColor(score: number): string {
  if (score >= 90) return "#1b865c";
  if (score >= 70) return "#d9a400";
  return "#e5484d";
}

export default async function HistoryPage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/login");

  const scans = await getUserScans(userId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Scan history</h1>
            <p className="mt-2 text-sm text-muted">
              Every audit you’ve run while signed in, newest first.
            </p>
          </div>
          {scans.length > 0 && <ClearHistoryButton />}
        </div>

        {scans.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scans.map((scan, i) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                // Score do scan anterior da MESMA url (lista está em ordem desc).
                prevScore={scans.slice(i + 1).find((o) => o.url === scan.url)?.score ?? null}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ScanCard({ scan, prevScore }: { scan: ScanListItem; prevScore: number | null }) {
  const sev = [
    { label: "Critical", value: scan.counts.critical, color: "#e5484d" },
    { label: "Serious", value: scan.counts.serious, color: "#b46107" },
    { label: "Moderate", value: scan.counts.moderate, color: "#d9a400" },
  ];

  const delta = prevScore === null ? null : scan.score - prevScore;

  return (
    <div className="group relative">
      <DeleteScanButton id={scan.id} />
      <Link
        href={`/report/${scan.id}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition-shadow hover:shadow-card"
      >
        <div className="relative aspect-video overflow-hidden border-b border-line bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/scan/${scan.id}/screenshot`}
            alt={`Screenshot of ${host(scan.finalUrl)}`}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-card"
            style={{ background: scoreColor(scan.score) }}
          >
            {scan.score}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">{host(scan.finalUrl)}</span>
              {delta !== null && delta !== 0 && (
                <span
                  className="shrink-0 text-[11px] font-bold"
                  style={{ color: delta > 0 ? "#1b865c" : "#e5484d" }}
                >
                  {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted">{dateFmt.format(scan.createdAt)}</div>
          </div>

          <div className="mt-auto flex items-center gap-3 text-xs text-muted">
            {sev.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.value}
              </span>
            ))}
            <span className="ml-auto font-medium text-success">{scan.counts.passed} passed</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-16 text-center">
      <p className="text-base font-semibold text-ink">No scans yet</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Run an audit while signed in and it’ll show up here, so you can track each site’s score over
        time.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Run a scan
      </Link>
    </div>
  );
}
