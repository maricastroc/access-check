import { ResultsView } from "./results-view";
import { auth, signOut } from "@/auth";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const user = (await auth())?.user ?? null;

  return (
    <ResultsView
      initialUrl={url ?? ""}
      user={user ? { name: user.name, email: user.email, image: user.image } : null}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
