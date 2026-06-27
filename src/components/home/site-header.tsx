import { Button, Logo } from "@/components/ui";
import { auth, signOut } from "@/auth";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = (await auth())?.user;

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
      <Logo />

      {user ? (
        <UserMenu
          user={{ name: user.name, email: user.email, image: user.image }}
          signOutAction={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        />
      ) : (
        <Button href="/login" variant="dark" className="px-4 py-2.5 font-medium">
          Sign in
        </Button>
      )}
    </header>
  );
}
