import { auth, signOut } from "@/auth";
import { Logo } from "@/components/ui";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#checks", label: "Checks" },
  { href: "#evidence", label: "Evidence Lens" },
  { href: "/history", label: "History" },
];

export async function SiteHeader() {
  const user = (await auth())?.user ?? null;

  return (
    <header className="border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[14.5px] text-body hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        {user ? (
          <UserMenu
            user={{ name: user.name, email: user.email, image: user.image }}
            signOutAction={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          />
        ) : (
          <a
            href="/login"
            className="border border-border bg-surface px-4 py-2 text-[14px] font-medium text-ink hover:bg-band"
          >
            Sign in
          </a>
        )}
      </div>
    </header>
  );
}
