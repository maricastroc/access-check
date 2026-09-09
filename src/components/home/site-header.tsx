import { auth, signOut } from "@/auth";
import { Logo } from "@/components/ui";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { translator, type MessageKey } from "@/lib/i18n/t";
import type { ReportLocale } from "@/lib/i18n/locale";

const NAV: { href: string; label: MessageKey }[] = [
  { href: "#how", label: "nav.howItWorks" },
  { href: "#checks", label: "nav.checks" },
  { href: "#evidence", label: "nav.evidenceLens" },
  { href: "/history", label: "nav.history" },
];

export async function SiteHeader({ locale }: { locale: ReportLocale }) {
  const user = (await auth())?.user ?? null;
  const t = translator(locale);

  return (
    <header className="border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[14.5px] text-body hover:text-ink">
              {t(n.label)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageSwitcher locale={locale} />
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
              {t("nav.signIn")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
