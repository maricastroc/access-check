import { Button, Logo } from "@/components/ui";
import { auth, signIn, signOut } from "@/auth";

export async function SiteHeader() {
  const user = (await auth())?.user;

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Logo />

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden text-sm font-medium text-ink-soft sm:block">
              {user.name ?? user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="dark" className="px-4 py-2.5 font-medium">
                Sign out
              </Button>
            </form>
          </>
        ) : (
          <>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
              className="hidden sm:block"
            >
              <button
                type="submit"
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Sign in
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="dark" className="px-4 py-2.5 font-medium">
                Start free
              </Button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
