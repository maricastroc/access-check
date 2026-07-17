import { ResultsView } from "./results-view";
import { auth, signOut } from "@/auth";
import { getSiteScanPageResult } from "@/lib/site-scans";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; site?: string }>;
}) {
  const { url, site } = await searchParams;
  const user = (await auth())?.user ?? null;

  const initialResult = site && url ? await getSiteScanPageResult(site, url) : null;

  return (
    <ResultsView
      initialUrl={url ?? ""}
      siteId={site ?? null}
      initialResult={initialResult}
      user={user ? { name: user.name, email: user.email, image: user.image } : null}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
